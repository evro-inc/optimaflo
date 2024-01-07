"use client";

import { clearSelectedRows, setIsLimitReached } from "@/src/app/redux/tableSlice";
import { DeleteContainers } from "@/src/lib/fetch/dashboard/gtm/actions/containers";
import { useRowSelection } from "@/src/lib/helpers/client";
import { ContainerType, DeleteContainersResponse } from "@/src/lib/types/types";
import { useDispatch } from "react-redux";
import { toast } from "sonner";




  export const handleDelete = async () => {
    const dispatch = useDispatch();

    const { selectedRows } = useRowSelection(
        (container) => container.containerId
    );


    toast('Deleting containers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const uniqueAccountIds = Array.from(
      new Set(
        Object.values(selectedRows).map((rowData: any) => rowData.accountId)
      )
    );

    const deleteOperations = uniqueAccountIds.map(async (accountId) => {
      const containersToDelete = Object.entries(
        selectedRows as { [key: string]: ContainerType }
      )
        .filter(([, rowData]) => rowData.accountId === accountId)
        .map(([containerId]) => containerId);

      return DeleteContainers(accountId, new Set(containersToDelete));
    });

    // Wait for all delete operations to complete
    const responses: DeleteContainersResponse[] = await Promise.all(
      deleteOperations
    );

    let notFoundContainers: any = [];

    responses.forEach((response, index) => {
      if (!response.success && response.errors) {
        response.errors.forEach((error) => {
          if (error.includes('Not found or permission denied')) {
            // Find the container ID and name associated with this error
            const containerId = Object.keys(selectedRows)[index];
            const containerName = selectedRows[containerId]?.name;
            notFoundContainers.push(`${containerName} (ID: ${containerId})`);
          }
        });
      }
    });

    // Check if any of the responses contains errors
    const hasErrors = responses.some(
      (response) =>
        !response.success ||
        response.limitReached ||
        (response.errors && response.errors.length > 0)
    );

    if (hasErrors) {
      // Display the message from each response if it exists
      responses.forEach((response) => {
        if (response.message) {
          toast.error(response.message, {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          });
        }
      });
    } else {
      // If no errors, show success toast
      responses.forEach((response) => {
        if (response.message) {
          toast.success(response.message + 'The table will update shortly.', {
            action: {
              label: 'Close',
              onClick: () => toast.dismiss(),
            },
          });
        }
      });
    }

    // Dispatch actions based on the responses
    const limitReached = responses.some((response) => response.limitReached);
    dispatch(setIsLimitReached(limitReached));

    dispatch(clearSelectedRows());
  };
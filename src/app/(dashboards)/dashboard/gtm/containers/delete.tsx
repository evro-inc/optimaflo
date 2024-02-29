'use client';

import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { DeleteContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { FeatureResponse } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const selectedRowsArray = Object.values(selectedRows); // Convert selectedRows to an array

  const handleDelete = async () => {
    toast('Deleting containers...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const uniqueAccountIds = Array.from(
      new Set(selectedRowsArray.map((rowData: any) => rowData.accountId))
    );

    const deleteOperations = uniqueAccountIds.map(async (accountId) => {
      const containersToDelete = selectedRowsArray
        .filter((rowData: any) => rowData.accountId === accountId)
        .map((rowData: any) => `${rowData.accountId}-${rowData.containerId}`);

      const containerNames = containersToDelete.map((combinedId) => {
        const [accountId, containerId] = combinedId.split('-');
        const container = selectedRowsArray.find(
          (rowData: any) => rowData.accountId === accountId && rowData.containerId === containerId
        ) as { name: string }; // Type assertion to specify the type of 'container'
        if (!container) {
          return undefined; // This will help identify which combinedId is problematic
        }
        return container.name;
      });
      const validContainerNames = containerNames.filter((name) => name !== undefined) as string[];

      return DeleteContainers(new Set(containersToDelete), validContainerNames);
    });

    // Wait for all delete operations to complete
    const responses: FeatureResponse[] = await Promise.all(deleteOperations);

    responses.forEach((response) => {
      if (!response.success) {
        // Initialize message with a default error message
        let message = response.message || 'An error occurred.';

        // Check if there are specific errors and join them into a single message
        if (response.errors && response.errors.length > 0) {
          message = response.errors.join(', ');
        }

        // If a notFoundError is present, override the message
        if (response.notFoundError) {
          dispatch(setNotFoundError(true)); // Dispatch the not found error action
        }

        // Display the toast with the constructed message
        toast.error(message, {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      } else if (response.message) {
        // If the deletion was successful and there's a message, display it
        toast.success(response.message + ' The table will update shortly.', {
          action: {
            label: 'Close',
            onClick: () => toast.dismiss(),
          },
        });
      }
    });

    const limitReached = responses.some((response) => response.limitReached);
    dispatch(setIsLimitReached(limitReached));

    const notFoundError = responses.some((response) => response.notFoundError);

    if (notFoundError) {
      // Filter out successful results before dispatching
      const unsuccessfulResults = responses.flatMap((response) =>
        response.results.filter((result) => !result.success)
      );
      dispatch(setErrorDetails(unsuccessfulResults)); // Dispatch only the unsuccessful error details
      dispatch(setNotFoundError(true));
    }

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };
  return handleDelete;
};

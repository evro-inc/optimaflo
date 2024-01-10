'use client';

import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
import { DeleteContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { useRowSelection } from '@/src/lib/helpers/client';
import { ContainerType, ContainersResponse } from '@/src/lib/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = () => {
  const dispatch = useDispatch();
  const { selectedRows } = useRowSelection(
    (container) => container.containerId
  );

  const handleDelete = async () => {
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

      const containerNames = containersToDelete.map(
        (containerId) => selectedRows[containerId].name
      );

      return DeleteContainers(new Set(containersToDelete), containerNames);
    });

    // Wait for all delete operations to complete
    const responses: ContainersResponse[] = await Promise.all(deleteOperations);

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
  };
  return handleDelete;
};

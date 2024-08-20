import { tierCreateLimit, tierUpdateLimit } from '../utils/server';
import { notFound, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { FeatureResponse, WorkspaceType } from '@/src/types/types';
import { createGTMVersion } from '../lib/fetch/dashboard/actions/gtm/workspaces';

export function useCreateHookForm(userId: string, createTierLimitType: string, url: string) {
  const router = useRouter();
  const dispatch = useDispatch();

  return async () => {
    if (!userId) {
      return notFound(); // Make sure `notFound` is defined or imported appropriately
    }

    try {
      const handleCreateLimit: any = await tierCreateLimit(userId, createTierLimitType); // Ensure tierCreateLimit is imported or defined

      if (handleCreateLimit && handleCreateLimit.limitReached) {
        dispatch(setIsLimitReached(true)); // Make sure setIsLimitReached is imported or defined
      } else {
        router.push(url);
      }
    } catch (error) {
      toast.error('An error occurred while creating. Please try again.'); // Optionally, display an error message to the user
      throw error; // Rethrow or handle as needed
    }
  };
}

export function useUpdateHookForm(
  userId: string,
  updateTierLimitType: string,
  url: string,
  rowSelectedCount: number
) {
  const router = useRouter();
  const dispatch = useDispatch();

  return async () => {
    if (!userId) {
      return notFound(); // Make sure `notFound` is defined or imported appropriately
    }

    const handleUpdateLimit: any = await tierUpdateLimit(userId, updateTierLimitType); // Ensure tierUpdateLimit is imported or defined

    const limit = Number(handleUpdateLimit.updateLimit);
    const updateUsage = Number(handleUpdateLimit.updateUsage);
    const availableUpdateUsage = limit - updateUsage;

    if (rowSelectedCount > availableUpdateUsage) {
      toast.error(
        `Cannot update ${rowSelectedCount} streams as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`
      );
      dispatch(setIsLimitReached(true));
    } else if (handleUpdateLimit && handleUpdateLimit.limitReached) {
      dispatch(setIsLimitReached(true));
    } else {
      router.push(url);
    }
  };
}

export const useDeleteHook = (
  deleteAction, // The dynamic delete action function
  selectedRows, // Selected rows, generic type
  table,        // The table instance to reset row selection
  getDisplayNames, // Function to extract display names from selected rows
  typeName = 'items' // A generic name to be used in toast messages (optional)
) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast(`Deleting ${typeName}...`, {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and map them as needed
    const itemsToDelete = Object.values(selectedRows).map((item) => item);

    const displayNames = getDisplayNames(itemsToDelete);

    // Call the dynamic delete action with the selected items and their display names
    const response: FeatureResponse = await deleteAction(
      new Set(itemsToDelete),
      displayNames
    );

    if (!response.success) {
      let message = response.message || 'An error occurred.';
      if (response.errors && response.errors.length > 0) {
        message = response.errors.join(', ');
      }
      if (response.notFoundError) {
        dispatch(setNotFoundError(true));
      }
      toast.error(message, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    } else {
      toast.success(`${response.message}. The table will update shortly.`, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }

    if (response.limitReached) {
      dispatch(setIsLimitReached(true));
    }

    if (response.notFoundError) {
      const unsuccessfulResults = response.results.filter((result) => !result.success);
      dispatch(setErrorDetails(unsuccessfulResults));
      dispatch(setNotFoundError(true));
    }

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };

  return handleDelete;
};

export const useRevertHook = (
  revertAction, // The dynamic revert action function
  selectedRows, // Selected rows, generic type
  table,        // The table instance to reset row selection
  getDisplayNames, // Function to extract display names from selected rows (optional)
  typeName = 'items' // A generic name to be used in toast messages (optional)
) => {
  const dispatch = useDispatch();

  const handleRevert = async () => {
    toast(`Reverting ${typeName}...`, {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and map them as needed
    const itemsToRevert = Object.values(selectedRows).map((item) => item);

    // Call the dynamic revert action with the selected items
    const response: FeatureResponse = await revertAction(new Set(itemsToRevert));

    if (!response.success) {
      let message = response.message || 'An error occurred.';
      if (response.errors && response.errors.length > 0) {
        message = response.errors.join(', ');
      }
      if (response.notFoundError) {
        dispatch(setNotFoundError(true));
      }
      toast.error(message, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    } else {
      toast.success(`${response.message}. The table will update shortly.`, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }

    if (response.limitReached) {
      dispatch(setIsLimitReached(true));
    }

    if (response.notFoundError) {
      const unsuccessfulResults = response.results.filter((result) => !result.success);
      dispatch(setErrorDetails(unsuccessfulResults));
      dispatch(setNotFoundError(true));
    }

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };

  return handleRevert;
};

export const useCreateVersionHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleCreateVersion = async () => {
    toast('Creating version(s)...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to WorkspaceType
    const workspacesToCreateVersion = Object.values(
      selectedRows as Record<string, WorkspaceType>
    ).map((workspace) => ({
      accountId: workspace.accountId,
      containerId: workspace.containerId,
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      description: workspace.description,
    }));

    const formData = {
      forms: workspacesToCreateVersion,
    };

    const response: FeatureResponse = await createGTMVersion(formData);

    if (!response.success) {
      let message = response.message || 'An error occurred.';
      if (response.errors && response.errors.length > 0) {
        message = response.errors.join(', ');
      }
      if (response.notFoundError) {
        dispatch(setNotFoundError(true));
      }
      toast.error(message, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    } else {
      toast.success(response.message + ' The table will update shortly.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }

    if (response.limitReached) {
      dispatch(setIsLimitReached(true));
    }

    if (response.notFoundError) {
      const unsuccessfulResults = response.results.filter((result) => !result.success);
      dispatch(setErrorDetails(unsuccessfulResults));
      dispatch(setNotFoundError(true));
    }

    table.resetRowSelection({});
  };

  return handleCreateVersion;
};

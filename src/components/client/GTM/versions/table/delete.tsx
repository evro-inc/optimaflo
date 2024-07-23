'use client';

import {
  DeleteBuiltInVariables,
  RevertBuiltInVariables,
} from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { FeatureResponse, BuiltInVariable } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting built-in variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to GA4AccountType
    const ga4BuiltInVarToDelete = Object.values(
      selectedRows as Record<string, BuiltInVariable>
    ).map((prop) => {
      return prop;
    });

    const toDeleteSet = new Set(
      ga4BuiltInVarToDelete
        .map((prop) => {
          if (prop.accountId && prop.containerId && prop.workspaceId) {
            return `${prop.accountId}-${prop.containerId}-${prop.workspaceId}`;
          }
          console.error('Invalid format for:', prop);
          return ''; // Return an empty string for invalid entries
        })
        .filter(Boolean) // Filter out any empty strings
    );

    const builtInVarDisplayNames = ga4BuiltInVarToDelete.flatMap((prop) => prop.type);

    const response: FeatureResponse = await DeleteBuiltInVariables(
      toDeleteSet,
      builtInVarDisplayNames
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

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };

  return handleDelete;
};

export const useRevertHookBuiltInVar = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleRevert = async () => {
    toast('Reverting built-in variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Convert the array to a Set<BuiltInVariable>
    const ga4BuiltInVarToRevert = new Set(
      Object.values(selectedRows).map((prop) => prop as BuiltInVariable)
    );

    const response: FeatureResponse = await RevertBuiltInVariables(ga4BuiltInVarToRevert);

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

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };

  return handleRevert;
};

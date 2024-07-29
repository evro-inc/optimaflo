'use client';

import { DeleteVariables, RevertVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { FeatureResponse, Variable } from '@/src/types/types';
import { revalidate } from '@/src/utils/server';
import { useUser } from '@clerk/nextjs';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();
  const { user } = useUser();
  const userId = user?.id as string;

  const handleDelete = async () => {
    toast('Deleting variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to GA4AccountType
    const ga4VarToDelete = Object.values(selectedRows as Record<string, Variable>).map((prop) => {
      return prop;
    });

    const response: FeatureResponse = await DeleteVariables(ga4VarToDelete);

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
      const keys = [
        `gtm:accounts:userId:${userId}`,
        `gtm:containers:userId:${userId}`,
        `gtm:workspaces:userId:${userId}`,
        `gtm:variables:userId:${userId}`,
      ];

      await revalidate(keys, '/dashboard/gtm/configurations', userId);

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

export const useRevertHookVar = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleRevert = async () => {
    toast('Reverting variables...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to GA4AccountType
    const ga4VarToDelete = Object.values(selectedRows as Record<string, Variable>).map((prop) => {
      return prop;
    });

    const response: FeatureResponse = await RevertVariables(ga4VarToDelete);

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

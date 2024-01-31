// src/app/(dashboards)/dashboard/gtm/accounts/delete.tsx
'use client';

import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { deleteAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { GA4AccountType, FeatureResponse } from '@/src/lib/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting accounts...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to GA4AccountType
    const ga4AccountsToDelete = Object.values(
      selectedRows as Record<string, GA4AccountType>
    ).map((account) => {
      return account.name;
    });

    const accountNames = ga4AccountsToDelete.map((name) => {
      // Extract the accountId part from the concatenated string
      // Find the account by its accountId and return its name or 'Unknown'
      return selectedRows[name]?.name || 'Unknown';
    });

    const response: FeatureResponse = await deleteAccounts(
      new Set(ga4AccountsToDelete),
      accountNames
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
      const unsuccessfulResults = response.results.filter(
        (result) => !result.success
      );
      dispatch(setErrorDetails(unsuccessfulResults));
      dispatch(setNotFoundError(true));
    }

    dispatch(clearSelectedRows());
    table.setRowSelection({});
  };

  return handleDelete;
};

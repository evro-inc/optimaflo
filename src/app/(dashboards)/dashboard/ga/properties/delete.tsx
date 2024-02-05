// src/app/(dashboards)/dashboard/gtm/accounts/delete.tsx
'use client';

import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/lib/redux/tableSlice';
import { deleteAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import {
  GA4AccountType,
  FeatureResponse,
  GA4PropertyType,
} from '@/src/lib/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { DeleteProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';

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
      selectedRows as Record<string, GA4PropertyType>
    ).map((prop) => {
      return prop;
    });

    console.log('ga4AccountsToDelete', ga4AccountsToDelete);

    const accountNames = ga4AccountsToDelete.map((name) => {
      return `properties/${name}`;
    });

    const response: FeatureResponse = await DeleteProperties(
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

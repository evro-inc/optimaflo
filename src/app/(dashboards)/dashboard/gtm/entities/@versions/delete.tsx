// src/app/(dashboards)/dashboard/gtm/versions/delete.tsx
'use client';

import {
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { DeleteVersions } from '@/src/lib/fetch/dashboard/actions/gtm/versions';
import { GTMContainerVersion, FeatureResponse } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting version(s)...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to WorkspaceType
    const versionsToDelete: GTMContainerVersion[] = Object.values(selectedRows as Record<string, GTMContainerVersion>);

    const response: FeatureResponse = await DeleteVersions(versionsToDelete);

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

  return handleDelete;
};

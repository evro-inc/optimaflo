'use client';

import { setErrorDetails, setIsLimitReached, setNotFoundError } from '@/src/redux/tableSlice';
import { DeletePermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';
import { GTMContainerVersion, FeatureResponse, UserPermission } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting user permission(s)...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const permissionsToDelete: UserPermission[] = Object.values(
      selectedRows as Record<string, UserPermission>
    );

    const permissionNames = permissionsToDelete.map((permission) => {
      // Extract the path from the selectedRows object
      return selectedRows[permission.accountId]?.path || 'Unknown';
    });

    const response: FeatureResponse = await DeletePermissions(permissionsToDelete, permissionNames);

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

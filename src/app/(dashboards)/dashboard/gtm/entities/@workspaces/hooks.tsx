// src/app/(dashboards)/dashboard/gtm/workspaces/delete.tsx
'use client';

import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { createGTMVersion, DeleteWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { WorkspaceType, FeatureResponse } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting workspaces...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to WorkspaceType
    const workspacesToDelete = Object.values(selectedRows as Record<string, WorkspaceType>).map(
      (workspace) => {
        return `${workspace.accountId}-${workspace.containerId}-${workspace.workspaceId}`;
      }
    );

    const workspaceNames = workspacesToDelete.map((workspaceId) => {
      // Extract the workspaceId part from the concatenated string
      // Find the workspace by its workspaceId and return its name or 'Unknown'
      return selectedRows[workspaceId]?.name || 'Unknown';
    });

    const response: FeatureResponse = await DeleteWorkspaces(
      new Set(workspacesToDelete),
      workspaceNames
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

    table.resetRowSelection({});
  };

  return handleDelete;
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
    const workspacesToCreateVersion = Object.values(selectedRows as Record<string, WorkspaceType>).map(
      (workspace) => ({
        accountId: workspace.accountId,
        containerId: workspace.containerId,
        workspaceId: workspace.workspaceId,
        name: workspace.name,
        description: workspace.description,
      })
    );

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
}

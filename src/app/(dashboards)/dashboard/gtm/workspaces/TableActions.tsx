'use client';
import React from 'react';
import {
  ButtonDelete,
  ButtonWithIcon,
  Icon,
} from '../../../../../components/client/Button/Button';
import { useDispatch } from 'react-redux';
import { setIsLimitReached } from '@/src/app/redux/tableSlice';
import { toggleCreate, toggleUpdate } from '@/src/app/redux/globalSlice';
import {
  revalidate,
  tierCreateLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';
import { useRowSelection } from '@/src/lib/helpers/client';
import Search from '../../../../../components/client/UI/Search';
import { useDeleteHook } from './delete';
import { toast } from 'sonner';
import { ReloadIcon } from '@radix-ui/react-icons';

const TableActions = ({ userId, allData }) => {
  const dispatch = useDispatch();
  const handleDelete = useDeleteHook();

  const { selectedRows } = useRowSelection(
    (workspace) => `${workspace.containerId}-${workspace.workspaceId}`
  );

  const handleCreateClick = async () => {
    try {
      const handleCreateLimit: any = await tierCreateLimit(
        userId,
        'GTMWorkspaces'
      );

      if (handleCreateLimit && handleCreateLimit.limitReached) {
        console.log('handleCreateLimit', handleCreateLimit);

        // Directly show the limit reached modal
        dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
      } else {
        // Otherwise, proceed with normal creation process
        dispatch(toggleCreate());
      }
    } catch (error) {
      console.error('Error in handleCreateClick:', error);
    }
  };

  const handleUpdateClick = async () => {
    try {
      const limitResponse: any = await tierUpdateLimit(userId, 'GTMWorkspaces');

      if (limitResponse && limitResponse.limitReached) {
        // Directly show the limit reached modal
        dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
      } else {
        // Otherwise, proceed with normal creation process
        dispatch(toggleUpdate());
      }
    } catch (error) {
      console.error('Error in handleUpdateClick:', error);
    }
  };

  const refreshAllCache = async () => {
    // Assuming you want to refresh cache for each workspace
    const keysToRefresh = allData.map((workspace) => {
      // Construct the key based on the workspace data
      const base = `gtm:workspaces`;
      const accountIdPart = `accountId:${workspace.accountId}`;
      const containerIdPart = `containerId:${workspace.containerId}`;
      const userIdPart = `userId:${userId}`;
      return [base, accountIdPart, containerIdPart, userIdPart]
        .filter(Boolean)
        .join(':');
    });

    await revalidate(keysToRefresh, '/dashboard/gtm/workspaces');
    toast.info(
      'Updating our systems. This may take a minute or two to update on screen.',
      {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      }
    );
  };

  return (
    <div className="inline-flex gap-x-2">
      <Search placeholder={''} />
      <Icon variant="create" onClick={refreshAllCache} icon={<ReloadIcon />} />
      <ButtonWithIcon
        variant="create"
        text="Create"
        icon={
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M2.63452 7.50001L13.6345 7.5M8.13452 13V2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
        onClick={handleCreateClick}
        billingInterval={undefined}
      />
      <ButtonWithIcon
        variant="create"
        text="Update"
        disabled={Object.keys(selectedRows).length === 0}
        icon={
          <svg
            className="w-3 h-3"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M2.63452 7.50001L13.6345 7.5M8.13452 13V2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
        onClick={handleUpdateClick}
        billingInterval={undefined}
      />
      <ButtonDelete
        text="Delete"
        disabled={Object.keys(selectedRows).length === 0}
        variant="delete"
        onClick={() => {}}
        onDelete={handleDelete}
        billingInterval={undefined}
      />
    </div>
  );
};

export default TableActions;

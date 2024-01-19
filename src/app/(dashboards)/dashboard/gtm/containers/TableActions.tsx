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
import { useRouter } from 'next/navigation';
import { useRowSelection } from '@/src/lib/helpers/client';
import { useDeleteHook } from '@/src/app/(dashboards)/dashboard/gtm/containers/delete';
import Search from '@/src/components/client/UI/Search';
import { toast } from 'sonner';
import { ReloadIcon } from '@radix-ui/react-icons';

const TableActions = ({ userId, allData }) => {
  const dispatch = useDispatch();
  const handleDelete = useDeleteHook();

  const { selectedRows } = useRowSelection(
    (container) => container.containerId
  );

  const handleCreateClick = async () => {
    try {
      const handleCreateLimit: any = await tierCreateLimit(
        userId,
        'GTMContainer'
      );

      if (handleCreateLimit && handleCreateLimit.limitReached) {
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
      const limitResponse: any = await tierUpdateLimit(userId, 'GTMContainer');

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
    const keysToRefresh = allData.map((item) => {
      // Construct the key based on the item data
      // Adjust the key structure to match your cache key format
      const base = `gtm:containers`;
      const accountIdPart = `accountId:${item.accountId}`;
      const userIdPart = `userId:${userId}`;
      return [base, accountIdPart, userIdPart].filter(Boolean).join(':');
    });
    await revalidate(keysToRefresh, '/dashboard/gtm/containers');
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

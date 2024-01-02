'use client';
import React from 'react';
import { ButtonDelete, ButtonWithIcon, Icon } from '../Button/Button';
import { useDispatch } from 'react-redux';
import { setIsLimitReached } from '@/src/app/redux/tableSlice';
import {
  toggleCreateContainer,
  toggleUpdateContainer,
} from '@/src/app/redux/globalSlice';
import { tierCreateLimit, tierUpdateLimit } from '@/src/lib/helpers/server';
import { ReloadIcon } from '@radix-ui/react-icons';

const TableActions = ({
  onDelete,
  isUpdateDisabled,
  isDeleteDisabled,
  onRefresh,
  userId,
}) => {
  const dispatch = useDispatch();

  const handleCreateClick = async () => {
    try {
      const limitResponse: any = await tierCreateLimit(userId, 'GTMContainer');

      if (limitResponse && limitResponse.limitReached) {
        // Directly show the limit reached modal
        dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
      } else {
        // Otherwise, proceed with normal creation process
        dispatch(toggleCreateContainer());
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
        dispatch(toggleUpdateContainer());
      }
    } catch (error) {
      console.error('Error in handleUpdateClick:', error);
    }
  };

  return (
    <div className="inline-flex gap-x-2">
      <Icon
        text={''}
        icon={<ReloadIcon />}
        variant="create"
        onClick={onRefresh}
        billingInterval={undefined}
      />
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
        disabled={isUpdateDisabled}
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
        disabled={isDeleteDisabled}
        variant="create"
        onClick={onDelete}
        billingInterval={undefined}
      />
    </div>
  );
};

export default TableActions;

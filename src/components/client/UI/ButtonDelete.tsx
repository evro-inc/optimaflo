'use client';
import React from 'react';
import { ButtonDelete } from '../Button/Button';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { DeleteWorkspaces } from '@/src/lib/actions/workspaces';
import logger from '@/src/lib/logger';
import { useAuth } from '@clerk/nextjs';

function ButtonDel() {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);
  const { getToken } = useAuth();

  const handleDelete = async () => {
    const token = (await getToken()) as string;
    try {
      // Transform selectedRows object into an array of deletion operations
      const deleteOperations = Object.values(selectedRows).map(
        (rowData: any) => {
          const { accountId, containerId, workspaceId } = rowData;
          return DeleteWorkspaces(
            accountId,
            [{ containerId, workspaceId }],
            token
          );
        }
      );

      // Await the resolution of all deletion operations
      await Promise.all(deleteOperations);
    } catch (error: any) {
      if (error.message && error.message.includes('Feature limit reached')) {
        dispatch(setIsLimitReached(true));
      } else {
        logger.error(
          'Error deleting workspace',
          error?.message || JSON.stringify(error)
        );
      }
    }
  };

  return (
    <ButtonDelete
      href="#"
      text="Delete"
      billingInterval={undefined}
      variant="delete"
      onClick={handleDelete}
      disabled={Object.keys(selectedRows).length === 0}
    />
  );
}

export default ButtonDel;

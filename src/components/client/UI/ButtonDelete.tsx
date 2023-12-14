'use client';
import React from 'react';
import { ButtonDelete } from '../Button/Button';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
import { DeleteWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import logger from '@/src/lib/logger';
import { DeleteWorkspacesResponse, WorkspaceType } from '@/src/lib/types/types';

function ButtonDel() {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  const handleDelete = async () => {
    try {
      const uniqueAccountIds = Array.from(
        new Set(
          Object.values(selectedRows).map((rowData: any) => rowData.accountId)
        )
      );
      const deleteOperations = uniqueAccountIds.map(async (accountId) => {
        const workspacesToDeleteArray = Object.entries(
          selectedRows as Record<string, WorkspaceType>
        )
          .filter(([, rowData]) => rowData.accountId === accountId)
          .map(([workspaceId]) => workspaceId);

        // Convert the array to a Set
        const workspacesToDeleteSet = new Set(workspacesToDeleteArray);

        // Now pass the Set to the DeleteWorkspaces function
        return await DeleteWorkspaces(accountId, workspacesToDeleteSet);
      });

      const responses: DeleteWorkspacesResponse[] = await Promise.all(
        deleteOperations
      );

      const limitReached = responses.some((response) => response.limitReached);
      const notFoundErrorOccurred = responses.some((response) =>
        response.results.some((result) => result.notFound)
      );

      dispatch(setIsLimitReached(limitReached));
      dispatch(setNotFoundError(notFoundErrorOccurred));
      dispatch(clearSelectedRows());
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

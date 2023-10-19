'use client';
import { selectTable, setSelectedRows } from '@/src/app/redux/tableSlice';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

function ToggleRow({ workspace, workspaces }) {
  const dispatch = useDispatch();

  const { selectedRows } = useSelector(selectTable);

  const toggleRow = (workspaceId, containerId, accountId) => {
    const uniqueKey = `${workspaceId}-${containerId}`;
    const newSelectedRows = { ...selectedRows };
    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      const workspace = workspaces.find(
        (w) => w.workspaceId === workspaceId && w.containerId === containerId
      );
      if (workspace) {
        newSelectedRows[uniqueKey] = {
          accountId: accountId,
          name: workspace.name,
          containerId: workspace.containerId,
          workspaceId: workspaceId,
        };
      }
    }
    dispatch(setSelectedRows(newSelectedRows));
  };
  return (
    <input
      type="checkbox"
      className="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
      id={`checkbox-${workspace.containerId}`}
      checked={
        !!selectedRows[`${workspace.workspaceId}-${workspace.containerId}`]
      }
      onChange={() =>
        toggleRow(
          workspace.workspaceId,
          workspace.containerId,
          workspace.accountId
        )
      }
    />
  );
}

export default ToggleRow;

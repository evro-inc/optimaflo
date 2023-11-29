'use client';
import {
  selectTable,
  setSelectedRows,
  toggleAllSelected,
} from '@/src/app/redux/tableSlice';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

function ToggleAll({ items, uniqueKeys }) {
  const dispatch = useDispatch();
  const { allSelected } = useSelector(selectTable);

  const toggleAll = () => {
    if (allSelected) {
      dispatch(setSelectedRows({}));
    } else {
      const newSelectedRows = {};
      items.forEach((item) => {
        const uniqueKey = uniqueKeys.map((key) => item[key]).join('-');
        newSelectedRows[uniqueKey] = item; // Store the entire item data
      });
      dispatch(setSelectedRows(newSelectedRows));
    }
    dispatch(toggleAllSelected());
  };


  return (
    <input
      type="checkbox"
      className="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
      id="hs-at-with-checkboxes-main"
      checked={allSelected}
      onChange={toggleAll}
    />
  );
}

export default ToggleAll;

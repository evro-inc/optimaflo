'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setSelectedRows } from '@/src/app/redux/tableSlice';

function ToggleRow({ item, items, uniqueKeys }) {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  const toggleRow = () => {
    const uniqueKey = uniqueKeys.map((key) => item[key]).join('-');
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      const selectedItem = items.find((i) =>
        uniqueKeys.every((key) => i[key] === item[key])
      );
      if (selectedItem) {
        newSelectedRows[uniqueKey] = uniqueKeys.reduce(
          (acc, key) => ({ ...acc, [key]: selectedItem[key] }),
          {}
        );
      }
    }
    dispatch(setSelectedRows(newSelectedRows));
  };

  const isChecked =
    !!selectedRows[uniqueKeys.map((key) => item[key]).join('-')];

  return (
    <input
      type="checkbox"
      className="shrink-0 border-gray-200 rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800"
      id={`checkbox-${item[uniqueKeys[0]]}`}
      checked={isChecked}
      onChange={toggleRow}
    />
  );
}

export default ToggleRow;

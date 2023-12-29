'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setSelectedRows } from '@/src/app/redux/tableSlice';

function ToggleRow({ item, uniqueKeys }) {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  const toggleRow = () => {
    //This line creates a unique identifier (uniqueKey) for each row in the table. It uses the uniqueKeys prop to get the keys that make up the unique identifier. It then joins the values of those keys with a dash (-) to create a unique string.
    const uniqueKey = uniqueKeys.map((key) => item[key]).join('-');

    //This line creates a copy of the current selectedRows state, which keeps track of which rows are selected
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      // Instead of just storing the unique key, store the entire item data
      newSelectedRows[uniqueKey] = item;
    }
    dispatch(setSelectedRows(newSelectedRows));
  };

  // Checks if the current row is selected. It uses the unique identifier to see if this row's data exists in selectedRows. The double exclamation mark (!!) converts the value to a boolean, indicating true if the row is selected and false if not.
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

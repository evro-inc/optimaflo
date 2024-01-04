'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setSelectedRows } from '@/src/app/redux/tableSlice';
import { Checkbox } from '../../ui/checkbox';

function ToggleRow({ item }) {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  // Since 'item' is the accountId itself, use it directly as the uniqueKey
  const uniqueKey = item;

  console.log("item", item);
  console.log("uniqueKey", uniqueKey);

  const toggleRow = () => {
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      newSelectedRows[uniqueKey] = item; // Here, item is the accountId itself
    }

    dispatch(setSelectedRows(newSelectedRows));
  };

  const isChecked = selectedRows.hasOwnProperty(uniqueKey);

  return (
    <Checkbox
      id={`select-row-${uniqueKey}`}
      checked={isChecked}
      onCheckedChange={toggleRow}
    />
  );
}

export default ToggleRow;

'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setSelectedRows } from '@/src/app/redux/tableSlice';
import { Checkbox } from '../../ui/checkbox';

function ToggleRow({ item }) {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  // Assume 'item' contains all necessary data like in ToggleAll
  const uniqueKey = item.accountId; // Assuming 'accountId' is the unique identifier in 'item'

  const toggleRow = () => {
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      newSelectedRows[uniqueKey] = item; // Add the entire item
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

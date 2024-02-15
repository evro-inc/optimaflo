'use client';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectTable, setSelectedRows } from '@/src/redux/tableSlice';
import { Checkbox } from '../../ui/checkbox';

interface InputToggleRowProps {
  item: any; // Replace 'any' with a specific type if possible
  uniqueIdentifier: string[]; // e.g., 'accountId', 'containerId'
}

export const ToggleRow: React.FC<InputToggleRowProps> = ({
  item,
  uniqueIdentifier,
}) => {
  const dispatch = useDispatch();
  const { selectedRows } = useSelector(selectTable);

  // Determine the uniqueKey based on whether uniqueIdentifier is a string or an array
  const uniqueKey = Array.isArray(uniqueIdentifier)
    ? uniqueIdentifier.map((key) => item[key]).join('-')
    : item[uniqueIdentifier];

  const toggleRow = () => {
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[uniqueKey]) {
      delete newSelectedRows[uniqueKey];
    } else {
      newSelectedRows[uniqueKey] = item;
    }

    dispatch(setSelectedRows(newSelectedRows));
  };

  const isChecked = Object.prototype.hasOwnProperty.call(
    selectedRows,
    uniqueKey
  );

  return (
    <Checkbox
      id={`select-row-${uniqueKey}`}
      checked={isChecked}
      onCheckedChange={toggleRow}
    />
  );
};

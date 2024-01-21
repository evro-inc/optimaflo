'use client';
import React from 'react';
import { ButtonWithIcon } from '../Button/Button';
import { useDispatch, useSelector } from 'react-redux';
import { toggleUpdate } from '@/src/lib/redux/sharedSlice';
import { selectTable } from '@/src/lib/redux/tableSlice';

function ButtonUpdate() {
  const dispatch = useDispatch();

  const { selectedRows } = useSelector(selectTable);

  return (
    <ButtonWithIcon
      variant="create"
      text="Update"
      disabled={Object.keys(selectedRows).length === 0}
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
      billingInterval={undefined}
      onClick={() => dispatch(toggleUpdate())}
    />
  );
}

export default ButtonUpdate;

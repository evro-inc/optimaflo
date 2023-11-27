'use client';
import React from 'react';
import { ButtonWithIcon } from '../Button/Button';
import { useDispatch } from 'react-redux';
import { toggleCreate } from '@/src/app/redux/sharedSlice';

function ButtonCreate() {
  const dispatch = useDispatch();
  return (
    <ButtonWithIcon
      variant="create"
      text="Create"
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
      onClick={() => dispatch(toggleCreate())}
    />
  );
}

export default ButtonCreate;

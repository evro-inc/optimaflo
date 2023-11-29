'use client';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import {
  selectEntity,
  toggleUpdate,
} from '@/src/app/redux/sharedSlice';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
const LimitReached = dynamic(
  () => import('../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);

const AccountFormUpdate = dynamic(
  () => import('../GTM/accounts/updateAccount'),
  {
    ssr: false,
  }
);


function AccountForms() {
  const dispatch = useDispatch();
  const { selectedRows, isLimitReached } = useSelector(selectTable);
  const { showUpdate } = useSelector(selectEntity); 

  return (
    <>
      {isLimitReached && <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />}
      {showUpdate && (
        <AccountFormUpdate
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}

export default AccountForms;

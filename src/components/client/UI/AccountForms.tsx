'use client';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { selectEntity, toggleUpdate } from '@/src/app/redux/sharedSlice';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
const LimitReached = dynamic(
  () => import('../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);

const AccountFormUpdate = dynamic(
  () => import('../../../app/(dashboards)/dashboard/gtm/accounts/update'),
  {
    ssr: false,
  }
);
const NotFoundErrorModal = dynamic(
  () =>
    import('../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

function AccountForms() {
  const dispatch = useDispatch();
  const { selectedRows, isLimitReached, notFoundError } =
    useSelector(selectTable);
  const { showUpdate } = useSelector(selectEntity);
  const [accountInfo, setAccountInfo] = useState({ accountId: [], name: [] });

  return (
    <>
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && (
        <NotFoundErrorModal feature="account" data={accountInfo} />
      )}

      {showUpdate && (
        <AccountFormUpdate
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          selectedRows={selectedRows}
          setAccountInfo={setAccountInfo}
        />
      )}
    </>
  );
}

export default AccountForms;

'use client';
import { selectTable, setIsLimitReached } from '@/src/lib/redux/tableSlice';
import { selectEntity, toggleUpdate } from '@/src/lib/redux/sharedSlice';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
const LimitReached = dynamic(
  () => import('../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);

const AccountFormUpdate = dynamic(
  () => import('../../../app/(dashboards)/dashboard/ga/accounts/update'),
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

interface Account {
  name: string;
  displayName: string;
  accountId: string; // Add the accountId property to the Account type
}

function AccountForms({ selectedRows }: { selectedRows: Account[] }) {
  const dispatch = useDispatch();
  const { isLimitReached, notFoundError } = useSelector(selectTable);
  const { showUpdate } = useSelector(selectEntity);
  const [, setAccountInfo] = useState({ accountId: [], name: [] }); // Update state initialization

  return (
    <>
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && <NotFoundErrorModal />}

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

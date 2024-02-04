'use client';
import { selectTable, setIsLimitReached } from '@/src/lib/redux/tableSlice';
import { selectEntity, toggleUpdate } from '@/src/lib/redux/sharedSlice';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
const LimitReached = dynamic(
  () =>
    import('../../../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const AccountFormUpdate = dynamic(() => import('./update'), {
  ssr: false,
});
const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

function AccountForms() {
  const dispatch = useDispatch();
  const { selectedRows, isLimitReached, notFoundError } =
    useSelector(selectTable);
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

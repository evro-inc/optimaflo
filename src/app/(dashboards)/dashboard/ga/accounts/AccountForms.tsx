'use client';
import { selectTable, setIsLimitReached } from '@/src/lib/redux/tableSlice';
import {
  selectGlobal,
  toggleCreate,
  toggleUpdate,
} from '@/src/lib/redux/globalSlice';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDisplayName } from 'next/dist/shared/lib/utils';
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

const AccountFormCreate = dynamic(() => import('./create'), {
  ssr: false,
});

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

interface Account {
  name: string;
  displayName: string;
}

function AccountForms({
  accounts,
  selectedRows,
}: {
  accounts;
  selectedRows: Account[];
}) {
  const dispatch = useDispatch();
  const { isLimitReached, notFoundError } = useSelector(selectTable);
  const { showUpdate, showCreate } = useSelector(selectGlobal);
  const [, setAccountInfo] = useState({ name: [], displayName: [] }); // Update state initialization

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

      {showCreate && (
        <AccountFormCreate
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
        />
      )}
    </>
  );
}

export default AccountForms;

'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectGlobal, toggleCreate, toggleUpdate } from '@/src/redux/globalSlice';
import { selectTable, setIsLimitReached } from '@/src/redux/tableSlice';
import { useError } from '@/src/hooks/helpers';

import { ErrorMessage } from '@/src/components/client/modals/Error';

//dynamic import for buttons
const LimitReachedModal = dynamic(
  () =>
    import('../../../../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const FormCreateContainer = dynamic(() => import('./create'), {
  ssr: false,
});

const FormUpdateContainer = dynamic(() => import('./update'), {
  ssr: false,
});

// In the component render method

export default function ContainerForms({ accounts, selectedRows, table }) {
  const dispatch = useDispatch();
  const { showCreate, showUpdate } = useSelector(selectGlobal);
  const { isLimitReached, notFoundError } = useSelector(selectTable);

  const { error, clearError } = useError();

  return (
    <>
      {/* Modals */}
      {isLimitReached && <LimitReachedModal onClose={() => dispatch(setIsLimitReached(false))} />}

      {notFoundError && <NotFoundErrorModal onClose={undefined} />}

      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreate && (
        <FormCreateContainer
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
        />
      )}
      {showUpdate && (
        <FormUpdateContainer
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          accounts={accounts}
          selectedRows={selectedRows}
          table={table}
        />
      )}
    </>
  );
}

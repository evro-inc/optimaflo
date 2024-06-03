'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectGlobal, // This was changed from selectEntity
  toggleCreate, // This was changed to be specific for workspaces
  toggleUpdate, // This was changed to be specific for workspaces
} from '@/src/redux/globalSlice'; // This was changed from sharedSlice
import { selectTable, setIsLimitReached } from '@/src/redux/tableSlice';
import { useError } from '@/src/hooks/helpers';

import { ErrorMessage } from '@/src/components/client/modals/Error';

// Dynamic imports for modals and forms
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

const FormCreateWorkspace = dynamic(() => import('./create'), {
  ssr: false,
});

const FormUpdateWorkspace = dynamic(() => import('./update'), {
  ssr: false,
});

function WorkspaceForms({ accounts, selectedRows, table }) {
  const dispatch = useDispatch();
  const { showCreate, showUpdate } = useSelector(selectGlobal);
  const { isLimitReached, notFoundError } = useSelector(selectTable);

  const { error, clearError } = useError();

  const tableData = table.getRowModel().rows.map((row) => row.original);

  return (
    <>
      {/* Modals */}
      {isLimitReached && <LimitReachedModal onClose={() => dispatch(setIsLimitReached(false))} />}

      {notFoundError && <NotFoundErrorModal />}

      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreate && (
        <FormCreateWorkspace
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
          table={tableData}
        />
      )}
      {showUpdate && (
        <FormUpdateWorkspace
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

export default WorkspaceForms;

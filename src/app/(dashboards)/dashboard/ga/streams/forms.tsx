'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectGlobal, // This was changed from selectEntity
  toggleCreate, // This was changed to be specific for properties
  toggleUpdate, // This was changed to be specific for properties
} from '@/src/lib/redux/globalSlice'; // This was changed from sharedSlice
import { selectTable, setIsLimitReached } from '@/src/lib/redux/tableSlice';
import { useError } from '@/src/lib/helpers/client';

import { ErrorMessage } from '@/src/components/client/modals/Error';

// Dynamic imports for modals and forms
const LimitReachedModal = dynamic(
  () =>
    import('../../../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const FormCreateStream = dynamic(() => import('./create'), {
  ssr: false,
});

const FormUpdateStream = dynamic(() => import('./update'), {
  ssr: false,
});

function StreamForms({ accounts, properties, selectedRows, table }) {
  const dispatch = useDispatch();
  const { showCreate, showUpdate } = useSelector(selectGlobal);
  const { isLimitReached, notFoundError } = useSelector(selectTable);
  const { error, clearError } = useError();
  const tableData = table.getRowModel().rows.map((row) => row.original);
  return (
    <>
      {/* Modals */}
      {isLimitReached && (
        <LimitReachedModal onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && <NotFoundErrorModal />}

      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreate && (
        <FormCreateStream
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
          properties={properties}
          table={tableData}
        />
      )}
      {showUpdate && (
        <FormUpdateStream
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}

export default StreamForms;

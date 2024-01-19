'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectGlobal, // This was changed from selectEntity
  toggleCreate, // This was changed to be specific for workspaces
  toggleUpdate, // This was changed to be specific for workspaces
} from '@/src/app/redux/globalSlice'; // This was changed from sharedSlice
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { useError, useRowSelection } from '@/src/lib/helpers/client';

import { ErrorMessage } from '@/src/components/client/modals/Error';

// Dynamic imports for modals and forms
const LimitReachedModal = dynamic(
  () => import('../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);

const NotFoundErrorModal = dynamic(
  () => import('../modals/notFoundError').then((mod) => mod.NotFoundError),
  { ssr: false }
);

const FormCreateWorkspace = dynamic(() => import('../GTM/workspaces/create'), {
  ssr: false,
});

const FormUpdateWorkspace = dynamic(() => import('../GTM/workspaces/update'), {
  ssr: false,
});

function WorkspaceForms({ accounts, workspaces }) {
  const dispatch = useDispatch();
  const { showCreate, showUpdate } = useSelector(selectGlobal);
  const { isLimitReached, notFoundError } = useSelector(selectTable);
  const { selectedRows } = useRowSelection(
    (workspace) => workspace.workspaceId
  );
  const { error, clearError } = useError();

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
        <FormCreateWorkspace
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
          workspaces={workspaces}
        />
      )}
      {showUpdate && (
        <FormUpdateWorkspace
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          accounts={accounts}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}

export default WorkspaceForms;

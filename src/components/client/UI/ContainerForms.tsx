'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectGlobal,
  toggleCreateContainer,
  toggleUpdateContainer,
} from '@/src/app/redux/globalSlice';
import {
  clearSelectedRows,
  selectTable,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/app/redux/tableSlice';
import {
  useError,
  useRowSelection,
  useToggleAll,
} from '@/src/lib/helpers/client';

import { ErrorMessage } from '@/src/components/client/modals/Error';


//dynamic import for buttons
const LimitReachedModal = dynamic(
  () =>
    import('../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const NotFoundErrorModal = dynamic(
  () =>
    import('../../../components/client/modals/notFoundError').then(
      (mod) => mod.NotFoundError
    ),
  { ssr: false }
);

const FormCreateContainer = dynamic(() => import('../../../app/(dashboards)/dashboard/gtm/containers/create'), {
  ssr: false,
});

const FormUpdateContainer = dynamic(() => import('../../../app/(dashboards)/dashboard/gtm/containers/update'), {
  ssr: false,
});

// In the component render method

export default function ContainerForms({ accounts, containers }) {
  const dispatch = useDispatch();
  const { showUpdateContainer, showCreateContainer } =
    useSelector(selectGlobal);
  const { isLimitReached, notFoundError } =
    useSelector(selectTable);
  const { selectedRows } = useRowSelection(
    (container) => container.containerId
  );
  const { error, clearError } = useError();


  return (
    <>

      {/* Modals */}
      {isLimitReached && (
        <LimitReachedModal onClose={() => dispatch(setIsLimitReached(false))} />
      )}

      {notFoundError && (
        <NotFoundErrorModal onClose={() => dispatch(setNotFoundError(false))} />
      )}

      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreateContainer && (
        <FormCreateContainer
          showOptions={showCreateContainer}
          onClose={() => dispatch(toggleCreateContainer())}
          accounts={accounts}
        />
      )}
      {showUpdateContainer && (
        <FormUpdateContainer
          showOptions={showUpdateContainer}
          onClose={() => dispatch(toggleUpdateContainer())}
          accounts={accounts}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}
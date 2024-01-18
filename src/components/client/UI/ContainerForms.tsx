'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectGlobal,
  toggleCreate,
  toggleUpdate,
} from '@/src/app/redux/globalSlice';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { useError, useRowSelection } from '@/src/lib/helpers/client';

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

const FormCreateContainer = dynamic(
  () => import('../../../app/(dashboards)/dashboard/gtm/containers/create'),
  {
    ssr: false,
  }
);

const FormUpdateContainer = dynamic(
  () => import('../../../app/(dashboards)/dashboard/gtm/containers/update'),
  {
    ssr: false,
  }
);

// In the component render method

export default function ContainerForms({ accounts }) {
  const dispatch = useDispatch();
  const { showUpdateContainer, showCreateContainer } =
    useSelector(selectGlobal);
  const { isLimitReached, notFoundError } = useSelector(selectTable);
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

      {notFoundError && <NotFoundErrorModal />}

      {error && <ErrorMessage onClose={clearError} />}

      {/* Forms */}
      {showCreateContainer && (
        <FormCreateContainer
          showOptions={showCreateContainer}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
        />
      )}
      {showUpdateContainer && (
        <FormUpdateContainer
          showOptions={showUpdateContainer}
          onClose={() => dispatch(toggleUpdate())}
          accounts={accounts}
          selectedRows={selectedRows}
        />
      )}
    </>
  );
}

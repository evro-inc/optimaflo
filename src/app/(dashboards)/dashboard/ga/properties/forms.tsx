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
const LimitReached = dynamic(
  () =>
    import('../../../../../components/client/modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);

const FormUpdate = dynamic(() => import('./update'), {
  ssr: false,
});

const FormCreate = dynamic(() => import('./create'), {
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

function PropertyForms({
  feature,
  selectedRows,
}: {
  feature;
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
        <FormUpdate
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          selectedRows={selectedRows}
          setAccountInfo={setAccountInfo}
        />
      )}

      {showCreate && (
        <FormCreate
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          feature={feature}
        />
      )}
    </>
  );
}

export default PropertyForms;

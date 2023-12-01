'use client';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import {
  selectEntity,
  toggleCreate,
  toggleUpdate,
} from '@/src/app/redux/sharedSlice';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

const LimitReached = dynamic(
  () => import('../modals/limitReached').then((mod) => mod.LimitReached),
  { ssr: false }
);
const FormCreate = dynamic(() => import('../GTM/workspaces/create'), {
  ssr: false,
});

const FormUpdate = dynamic(() => import('../GTM/workspaces/update'), {
  ssr: false,
});



function WorkspaceForms({ accounts, workspaces }) {
  const dispatch = useDispatch();
  const { selectedRows, isLimitReached } = useSelector(selectTable);
  const { showUpdate, showCreate } = useSelector(selectEntity);

  return (
    <>
      {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}
      {showCreate && (
        <FormCreate
          showOptions={showCreate}
          onClose={() => dispatch(toggleCreate())}
          accounts={accounts}
          workspaces={workspaces}
        />
      )}
      {showUpdate && (
        <FormUpdate
          showOptions={showUpdate}
          onClose={() => dispatch(toggleUpdate())}
          accounts={accounts}
          selectedRows={selectedRows}
          workspaces={workspaces} // or any other entities
        />
      )}
    </>
  );
}

export default WorkspaceForms;

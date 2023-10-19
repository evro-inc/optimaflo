'use client';
import { selectTable, setIsLimitReached } from '@/src/app/redux/tableSlice';
import { selectWorkspace, toggleCreateWorkspace, toggleUpdateWorkspace } from '@/src/app/redux/workspaceSlice';
import dynamic from 'next/dynamic';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
const LimitReached = dynamic(
  () =>
    import('../modals/limitReached').then(
      (mod) => mod.LimitReached
    ),
  { ssr: false }
);
const FormCreateWorkspace = dynamic(
  () => import('../GTM/workspaces/create'),
  {
    ssr: false,
  }
);

const FormUpdateWorkspace = dynamic(
  () => import('../GTM/workspaces/update'),
  {
    ssr: false,
  }
);

type Props = {
  accounts: any,
  containers: any,
  workspaces: any
};


function WorkspaceForms(props: Props) {
  const { accounts, containers, workspaces } = props;
  const dispatch = useDispatch();
  const { selectedRows, isLimitReached } = useSelector(selectTable);
  const { showUpdateWorkspace, showCreateWorkspace } = useSelector(selectWorkspace);
  return (
    <>
    {isLimitReached && (
        <LimitReached onClose={() => dispatch(setIsLimitReached(false))} />
      )}
      {useSelector(selectWorkspace).showCreateWorkspace && (
        <FormCreateWorkspace
          showOptions={showCreateWorkspace}
          onClose={() => dispatch(toggleCreateWorkspace())}
          accounts={accounts}
          containers={containers}
        />
      )}

      {useSelector(selectWorkspace).showUpdateWorkspace && (
        <FormUpdateWorkspace
          showOptions={showUpdateWorkspace}
          onClose={() => dispatch(toggleUpdateWorkspace())}
          accounts={accounts}
          selectedRows={selectedRows}
          containers={containers}
          workspaces={workspaces}
        />
      )}
    </>
  );
}

export default WorkspaceForms;

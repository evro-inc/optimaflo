import React from 'react';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';
import { gtmListContainers } from '@/src/lib/actions/containers';
import { gtmListWorkspaces } from '@/src/lib/actions/workspaces';

export default async function WorkspacePage() {
  const workspaceData = gtmListWorkspaces();
  const containerData = gtmListContainers();

  const [workspaceList, containerList] = await Promise.all([
    workspaceData,
    containerData,
  ]);

  return (
    <>
      <WorkspaceTable containers={containerList} workspaces={workspaceList} />
    </>
  );
}

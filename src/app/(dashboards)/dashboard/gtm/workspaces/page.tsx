"use server";
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { gtmListAccounts } from '@/src/lib/actions/accounts';
import WorkspaceTable from '@/src/components/server/GTM/workspaces/table';
import { gtmListWorkspaces } from '@/src/lib/actions/workspaces';
import { gtmListContainers } from '@/src/lib/actions/containers';


export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  //fetch all containers from API
  const [accounts, workspaces, containers] = await Promise.all([
    gtmListAccounts(),
    gtmListWorkspaces(),
    gtmListContainers(),
  ]);

  return (
    <>
      <WorkspaceTable
        accounts={accounts}
        containers={containers}
        workspaces={workspaces}
      />
    </>
  );
}

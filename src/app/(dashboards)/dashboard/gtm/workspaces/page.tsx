import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { gtmListAccounts } from '@/src/lib/fetch/dashboard/gtm/accounts';
import { gtmListWorkspaces } from '@/src/lib/fetch/dashboard/gtm/workspace';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  //fetch all containers from API
  const [accounts, workspaces] = await Promise.all([
    gtmListAccounts(),
    gtmListWorkspaces(),
  ]);

  return (
    <>
      <WorkspaceTable accounts={accounts} workspaces={workspaces} />
    </>
  );
}

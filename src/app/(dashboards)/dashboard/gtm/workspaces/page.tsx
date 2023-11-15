import React from 'react';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';
import { redirect } from 'next/navigation';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';
import { listGtmContainers } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/route';
import { listGtmWorkspaces } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/[containerId]/workspaces/route';


export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;
  const accessToken = await getAccessToken(userId);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  // Fetch accounts
  const accounts = await listGtmAccounts(userId, accessToken);

  console.log('accounts', accounts);
  

  // Fetch containers for each account in parallel
  const containersPromises = accounts.data.map(account =>
    listGtmContainers(userId, accessToken, account.accountId)
  );
  
  const containersResults = await Promise.all(containersPromises);
  const containerList = containersResults.map(result => result[0].data).flat();  

  console.log('containerList', containerList);


  const workspacesPromises = containerList.map(container =>
    listGtmWorkspaces(userId, accessToken, container.accountId, container.containerId)
  );
  const workspacesResults = await Promise.all(workspacesPromises);
  const workspaceList = workspacesResults.flatMap(result => result ? result.data : []);


  
  return (
    <>
      <WorkspaceTable containers={containerList} workspaces={workspaceList} />
    </>
  );
}

import React from 'react';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';
import { notFound, redirect } from 'next/navigation';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';
import { listGtmContainers } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/route';
import { listGtmWorkspaces } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/[containerId]/workspaces/route';
import { clerkClient, currentUser } from '@clerk/nextjs';

export default async function WorkspacePage() {
  const user = await currentUser()
  if (!user) return notFound()
  const userId = user?.id;  
  const accessToken = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_google")
  

  if (!userId) {
    // Handle the null case, e.g., redirecting or showing an error
    redirect('/');
    return;
  }
  

  // Fetch accounts
  const accounts = await listGtmAccounts(userId, accessToken[0].token);

  // Fetch containers for each account in parallel
  const containersPromises = accounts.data.map((account) =>
    listGtmContainers(userId, accessToken[0].token, account.accountId)
  );

  const containersResults = await Promise.all(containersPromises);
  const containerList = containersResults
    .map((result) => result[0].data)
    .flat();

  const workspacesPromises = containerList.map((container) =>
    listGtmWorkspaces(
      userId,
      accessToken[0].token,
      container.accountId,
      container.containerId
    )
  );
  const workspacesResults = await Promise.all(workspacesPromises);
  const workspaceList = workspacesResults.flatMap((result) =>
    result ? result.data : []
  );

  return (
    <>
      <WorkspaceTable containers={containerList} workspaces={workspaceList} />
    </>
  );
}

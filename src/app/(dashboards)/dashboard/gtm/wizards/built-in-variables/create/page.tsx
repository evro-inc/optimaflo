import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import FormCreateBuiltInVariable from './form';

export default async function BuiltInVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const builtInVarData = await listGtmBuiltInVariables();

  const [accounts, containers, workspaces, builtInVar] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
    builtInVarData,
  ]);

  const flatAccounts = accounts.flat();
  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();
  const flatBuiltInVars = builtInVar.flat();

  const combinedData = flatBuiltInVars.flatMap((builtInVarEntry) => {
    // Extract individual details
    const { accountId, containerId, workspaceId, type, name } = builtInVarEntry;

    // Find corresponding account, container, and workspace details
    const accountDetails = flatAccounts.find((p) => p.accountId === accountId);
    const containerDetails = flatContainers.find((p) => p.containerId === containerId);
    const workspaceDetails = flatWorkspaces.find((p) => p.workspaceId === workspaceId);

    const accountName = accountDetails ? accountDetails.name : 'Account Name Unknown';
    const containerName = containerDetails ? containerDetails.name : 'Container Name Unknown';
    const workspaceName = workspaceDetails ? workspaceDetails.name : 'Workspace Name Unknown';

    // Return the formatted data for DataTable
    return {
      name: name,
      type: type,
      accountName,
      containerName,
      workspaceName,
      accountId,
      containerId,
      workspaceId,
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateBuiltInVariable
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          containers={containers}
          workspaces={workspaces}
          properties={combinedData}
        />
      </div>
    </>
  );
}

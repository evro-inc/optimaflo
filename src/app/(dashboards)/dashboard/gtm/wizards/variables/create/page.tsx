import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import FormCreateVariable from './form';
import { listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';

export default async function BuiltInVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGtmAccounts(true);
  const containerData = await listGtmContainers(true);
  const workspaceData = await listGtmWorkspaces(true);
  const varData = await listVariables();

  const [accounts, containers, workspaces, variable] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
    varData,
  ]);

  const flatAccounts = accounts.flat();
  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();
  const flatVars = variable.flat();

  const combinedData = flatVars.map((vars) => {
    const accountId = vars.accountId;
    const containerId = vars.containerId;
    const workspaceId = vars.workspaceId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    return {
      ...vars,
      accountName,
      containerName,
      workspaceName,
    };
  });

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMVariables'
  );
  const createLimit = foundTierLimit?.createLimit || 0;
  const createUsage = foundTierLimit?.createUsage || 0;
  const remainingCreate = createLimit - createUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/gtm/configurations'); // Replace with the actual path you want to redirect to
  }

  console.log('flatWorkspaces', flatWorkspaces);

  return (
    <>
      <div className="container">
        <FormCreateVariable
          tierLimits={tierLimits}
          table={combinedData}
          workspaces={flatWorkspaces}
        />
      </div>
    </>
  );
}

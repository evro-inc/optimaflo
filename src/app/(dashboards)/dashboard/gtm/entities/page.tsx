import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import PublishGTM from '@/src/components/client/GTM/versions/publish';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import {
  getStatusGtmWorkspaces,
  listGtmWorkspaces,
} from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listGtmEnvs } from '@/src/lib/fetch/dashboard/actions/gtm/envs';

export default async function Page() {
  const { userId } = auth();
  if (!userId) return notFound();

  const subscription = await getSubscription(userId);
  const subscriptionId = subscription.id;
  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const wsChangeData = await getStatusGtmWorkspaces();
  const gtmEnvsData = await listGtmEnvs();

  const [accounts, containers, workspaces, wsChanges, gtmEnvs] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
    wsChangeData,
    gtmEnvsData,
  ]);

  const flatAccounts = accounts.flat();
  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();
  const flatChanges = wsChanges.flat();
  const flatEnvs = gtmEnvs.flat();

  const filteredEnvs = flatEnvs.filter((env) => env.type !== 'workspace');

  const transformedData = flatChanges.flatMap((changeSet, index) =>
    (changeSet.workspaceChange || []).map((change, itemIndex) => ({
      setId: index + 1,
      changeId: itemIndex + 1,
      ...change,
    }))
  );

  const combinedData = transformedData.map((vars) => {
    let accountId, containerId, workspaceId, name, type;

    if (vars.variable) {
      accountId = vars.variable.accountId;
      containerId = vars.variable.containerId;
      workspaceId = vars.variable.workspaceId;
      name = vars.variable.name;
      type = vars.variable.type;
    } else if (vars.builtInVariable) {
      accountId = vars.builtInVariable.accountId;
      containerId = vars.builtInVariable.containerId;
      workspaceId = vars.builtInVariable.workspaceId;
      name = vars.builtInVariable.name;
      type = vars.builtInVariable.type;
    } else {
      return vars; // No variable or builtInVariable
    }

    const account = flatAccounts.find((p) => p.accountId === accountId);
    const container = flatContainers.find((p) => p.containerId === containerId);
    const workspace = flatWorkspaces.find((p) => p.workspaceId === workspaceId);

    const accountName = account ? account.name : 'Account Name Unknown';
    const containerName = container ? container.name : 'Container Name Unknown';
    const workspaceName = workspace ? workspace.name : 'Workspace Name Unknown';

    return {
      ...vars,
      accountName,
      accountId,
      containerName,
      containerId,
      workspaceName,
      workspaceId,
      name,
      type,
    };
  });
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Entities</h1>
        <PublishGTM changes={combinedData} envs={filteredEnvs} tierLimits={tierLimits} />
      </div>
    </div>
  );
}

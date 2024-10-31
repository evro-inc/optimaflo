import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import PublishGTM from '@/src/components/client/GTM/publish';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import {
  listGtmWorkspaces,
  getStatusGtmWorkspaces,
} from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listGtmEnvs } from '@/src/lib/fetch/dashboard/actions/gtm/envs';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';

export const revalidate = 10;

export default async function Page() {
  const { userId } = await auth();
  if (!userId) return notFound();

  const subscription = await getSubscription(userId);
  const subscriptionId = subscription.id;
  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const wsChangeData = await getStatusGtmWorkspaces();
  const gtmEnvsData = await listGtmEnvs(true);

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

  // Helper function to extract common metadata from any GTM entity
  const extractMetadata = (item) => {
    const entity = item.variable || item.builtInVariable || item.tag || item.trigger || item;

    return {
      accountId: entity.accountId,
      containerId: entity.containerId,
      workspaceId: entity.workspaceId,
      name: entity.name,
      type: entity.type || entity.tag ? 'tag' : entity.trigger ? 'trigger' : 'unknown',
    };
  };

  // Simplify combinedData by using the extractMetadata function
  const combinedData = transformedData.map((vars) => {
    // Extract metadata from the current item
    const { accountId, containerId, workspaceId, name, type } = extractMetadata(vars);

    // Find the corresponding account, container, and workspace
    const account = flatAccounts.find((p) => p.accountId === accountId);
    const container = flatContainers.find((p) => p.containerId === containerId);
    const workspace = flatWorkspaces.find((p) => p.workspaceId === workspaceId);

    // Assign account, container, and workspace names
    const accountName = account ? account.name : 'Account Name Unknown';
    const containerName = container ? container.name : 'Container Name Unknown';
    const workspaceName = workspace ? workspace.name : 'Workspace Name Unknown';

    // Return the enriched vars object
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
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Configurations
        </h1>
        <PublishGTM changes={combinedData} envs={filteredEnvs} tierLimits={tierLimits} />
      </div>
    </div>
  );
}

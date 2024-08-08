import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import FormCreateWorkspace from './form';

export default async function CreateStreamPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();

  const [accounts, containers, workspaces] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
  ]);

  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();

  const combinedData = flatWorkspaces.map((workspace) => {
    const account = accounts.find((a) => a.accountId === workspace.accountId);
    const container = flatContainers.find((c) => c.containerId === workspace.containerId);
    if (account && container) {
      return {
        ...workspace,
        accountName: account.name,
        containerName: container.name,
      };
    } else {
      return {
        ...workspace,
        accountName: 'Unknown Account',
        containerName: 'Unknown Container',
      };
    }
  });
  return (
    <>
      <div className="container mx-auto py-10">
        <FormCreateWorkspace tierLimits={tierLimits} table={combinedData} accounts={accounts} />
      </div>
    </>
  );
}

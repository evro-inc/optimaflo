import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import PublishGTM from '@/src/components/client/GTM/versions/publish';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import {
  listGtmWorkspaces,
  getStatusGtmWorkspaces,
} from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listGtmEnvs } from '@/src/lib/fetch/dashboard/actions/gtm/envs';

export default async function Page() {
  const { userId } = auth();
  if (!userId) return notFound();

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
    const accountId = vars.builtInVariable.accountId;
    const containerId = vars.builtInVariable.containerId;
    const workspaceId = vars.builtInVariable.workspaceId;

    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);

    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    return {
      ...vars,
      accountName,
      accountId,
      containerName,
      containerId,
      workspaceName,
      workspaceId,
    };
  });

  console.log('filteredEnvs', filteredEnvs);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Configurations
        </h1>
        <PublishGTM changes={combinedData} envs={filteredEnvs} />
      </div>
      {/* Other content can go here */}
    </div>
  );
}

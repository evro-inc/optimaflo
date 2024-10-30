import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { DataTable } from './table';
import { listGtmBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variables';
import { listTags } from '@/src/lib/fetch/dashboard/actions/gtm/tags';
import { listTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';

export default async function ChangesPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const { userId } = await auth();
  if (!userId) return notFound();

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const builtInVarData = await listGtmBuiltInVariables();
  const varData = await listVariables();
  const tagData = await listTags();
  const triggerData = await listTriggers();

  const [accounts, containers, workspaces, builtInVar, variable, tag, trigger] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
    builtInVarData,
    varData,
    tagData,
    triggerData,
  ]);

  const flatAccounts = accounts.flat();
  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();
  const flatBuiltInVars = builtInVar.flat();
  const flatVars = variable.flat();
  const flatTags = tag.flat();
  const flatTriggers = trigger.flat();

  // Modified mapCombinedData function to accept featureName parameter
  const mapCombinedData = (varsArray: any[], featureName: string) => {
    return varsArray.map((vars) => {
      const accountId = vars.accountId;
      const containerId = vars.containerId;
      const workspaceId = vars.workspaceId;
      const account = flatAccounts.find((p) => p.accountId === accountId);
      const container = flatContainers.find((p) => p.containerId === containerId);
      const workspace = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
      const accountName = account ? account.name : 'Account Name Unknown';
      const containerName = container ? container.name : 'Container Name Unknown';
      const workspaceName = workspace ? workspace.name : 'Workspace Name Unknown';

      return {
        ...vars,
        accountName,
        containerName,
        workspaceName,
        featureName, // Add featureName property to each object
      };
    });
  };

  // Use mapCombinedData with appropriate feature names
  const combinedData = [
    ...mapCombinedData(flatBuiltInVars, 'Built-In Variable'),
    ...mapCombinedData(flatVars, 'Variable'),
    ...mapCombinedData(flatTags, 'Tag'),
    ...mapCombinedData(flatTriggers, 'Trigger'),
  ];

  return (
    <>
      <Suspense
        key={query + currentPage}
        fallback={
          <div className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden dark:bg-slate-900 dark:border-gray-700">
              {/* Skeleton for Table Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Skeleton className="h-6 mb-4 w-1/4" />
              </div>
              {/* Skeleton for Table Rows */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-6 py-4 grid grid-cols-3 gap-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div className="container mx-auto py-10">
          <DataTable columns={columns} data={combinedData} />
        </div>
      </Suspense>
    </>
  );
}

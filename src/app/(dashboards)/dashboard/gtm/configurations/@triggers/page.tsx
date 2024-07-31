import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { DataTable } from './table';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import {
  getStatusGtmWorkspaces,
  listGtmWorkspaces,
} from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listTriggers } from '@/src/lib/fetch/dashboard/actions/gtm/triggers';
import { triggerTypeArray } from './items';

export default async function triggerPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const { userId } = auth();
  if (!userId) return notFound();

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const workspaceData = await listGtmWorkspaces();
  const triggerData = await listTriggers();
  const statusData = await getStatusGtmWorkspaces();

  const [accounts, containers, workspaces, trigger, status] = await Promise.all([
    accountData,
    containerData,
    workspaceData,
    triggerData,
    statusData,
  ]);

  const flatAccounts = accounts.flat();
  const flatContainers = containers.flat();
  const flatWorkspaces = workspaces.flat();
  const flatTriggers = trigger.flat();
  const flatStatus = status.flat();

  const statusDataFlat = flatStatus.flatMap((changeSet, index) =>
    (changeSet.workspaceChange || []).map((change, itemIndex) => ({
      setId: index + 1,
      changeId: itemIndex + 1,
      ...change,
    }))
  );

  const getTriggerTypeName = (type: string) => {
    const triggerType = triggerTypeArray.find((item) => item.type === type);
    return triggerType ? triggerType.name : 'Unknown Type';
  };

  const combinedData = flatTriggers.map((triggers) => {
    const accountId = triggers.accountId;
    const containerId = triggers.containerId;
    const workspaceId = triggers.workspaceId;
    const accounts = flatAccounts.find((p) => p.accountId === accountId);
    const containers = flatContainers.find((p) => p.containerId === containerId);
    const workspaces = flatWorkspaces.find((p) => p.workspaceId === workspaceId);
    const accountName = accounts ? accounts.name : 'Account Name Unknown';
    const containerName = containers ? containers.name : 'Container Name Unknown';
    const workspaceName = workspaces ? workspaces.name : 'Workspace Name Unknown';

    const isPublished = statusDataFlat.find(
      (p) =>
        p.trigger &&
        p.trigger.name === triggers.name &&
        p.trigger.accountId === triggers.accountId &&
        p.trigger.containerId === triggers.containerId &&
        p.trigger.workspaceId === triggers.workspaceId
    )
      ? 'Unpublished'
      : 'Published';

    return {
      ...triggers,
      typeName: getTriggerTypeName(triggers.type),
      accountName,
      containerName,
      workspaceName,
      isPublished,
    };
  });

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

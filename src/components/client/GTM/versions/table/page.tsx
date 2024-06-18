import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { DataTable } from './table';
import { listGtmBuiltInVariables } from '@/src/lib/fetch/dashboard/actions/gtm/variablesBuiltIn';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import {
  getStatusGtmWorkspaces,
  listGtmWorkspaces,
} from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';

export default async function KeyEventsPage({
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
  const builtInVarData = await listGtmBuiltInVariables();
  const wsChanges = await getStatusGtmWorkspaces();

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

  const combinedData = flatBuiltInVars.map((vars) => {
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

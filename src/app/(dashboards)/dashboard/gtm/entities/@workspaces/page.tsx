import React, { Suspense } from 'react';
import { DataTable } from '@/src/app/(dashboards)/dashboard/gtm/entities/@workspaces/table';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';

export default async function WorkspacePage({
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
          <DataTable columns={columns} data={combinedData} accounts={accounts} />
        </div>
      </Suspense>
    </>
  );
}

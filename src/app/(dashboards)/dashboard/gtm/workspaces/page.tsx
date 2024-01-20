import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import WorkspaceTable from './table';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { Skeleton } from '@/src/components/ui/skeleton';

async function getAccounts() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();

    const accounts = await listGtmAccounts();
    return accounts;
  } catch (error: any) {
    throw new Error('Error fetching accounts:', error);
  }
}

async function getWorkspaces() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();

    const accounts = await listGtmAccounts();

    const containersPromises = accounts.map((account) =>
      listGtmContainers(account.accountId)
    );
    const containers = await Promise.all(containersPromises);
    const flattenedContainers = containers.flat();

    const workspacesPromises = containers.flat().map((container) => {
      return listGtmWorkspaces(container.accountId, container.containerId);
    });
    const workspaces = await Promise.all(workspacesPromises);
    const flattenedWorkspaces = workspaces.flat();

    const combinedData = flattenedWorkspaces.map((workspace) => {
      const account = accounts.find(
        (acc) => acc.accountId === workspace.accountId
      );
      const container = flattenedContainers.find(
        (container) => container.containerId === workspace.containerId
      );
      return {
        ...workspace,
        accountName: account ? account.name : '',
        containerName: container ? container.name : '',
      };
    });

    return combinedData;
  } catch (error: any) {
    return notFound();
  }
}

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

  const accountData = await getAccounts();
  const workspaceData = await getWorkspaces();

  const [accounts, workspaces] = await Promise.all([
    accountData,
    workspaceData,
  ]);

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
        <WorkspaceTable
          accounts={accounts}
          workspaces={workspaces}
          query={query}
          currentPage={currentPage}
        />
      </Suspense>
    </>
  );
}

'use server';

import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import WorkspaceTable from './table';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { Skeleton } from '@/src/components/ui/skeleton';

/* async function getWorkspaces() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();

    // Fetch accounts and containers in parallel
    const accountsPromise = listGtmAccounts();
    const containersPromise = accountsPromise.then(accounts =>
      Promise.all(accounts.map(account => listGtmContainers()))
    );

    // Wait for containers to finish fetching
    const accounts = await accountsPromise;
    const containersNestedArray = await containersPromise;
    const containers = containersNestedArray.flat();

    // Initiate workspace fetches in parallel without waiting for containers to finish
    const workspacesPromises = containers.map(container =>
      listGtmWorkspaces()
    );

    // Wait for all workspace fetches to complete
    const workspacesNestedArray = await Promise.all(workspacesPromises);
    const workspaces = workspacesNestedArray.flat();

    const combinedData = workspaces.map((workspace) => {
      const account = accounts.find(
        (acc) => acc.accountId === workspace.accountId
      );
      const container = workspaces.find(
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
} */

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
          containers={containers}
          workspaces={workspaces}
          query={query}
          currentPage={currentPage}
        />
      </Suspense>
    </>
  );
}

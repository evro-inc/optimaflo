import React, { Suspense } from 'react';
import ContainerTable from '@/src/app/(dashboards)/dashboard/gtm/containers/table';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';

export default async function ContainerPage({
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

  // Fetch
  const allAccounts = await listGtmAccounts();

  // Fetch containers for all accounts in parallel
  const containersPromises = allAccounts.map((account) =>
    listGtmContainers(account.accountId)
  );

  // Wait for all container fetches to complete
  const containersResults = await Promise.all(containersPromises);

  // Combine account data with container data
  const combinedData = containersResults
    .map((result, index) => {
      const account = allAccounts[index];
      // Check if result is already the expected array of containers
      if (Array.isArray(result)) {
        return result.map((container) => ({
          ...container,
          accountName: account.name,
        }));
      }
      // Check if result is an object with a containers property
      else if (result && Array.isArray(result.containers)) {
        return result.containers.map((container) => ({
          ...container,
          accountName: account.name,
        }));
      }
      // Check if result is undefined or in an unexpected format
      else {
        throw new Error(
          `Unexpected result from listGtmContainers for account ${account.accountId}`
        );
        return [];
      }
    })
    .flat();

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
        <ContainerTable
          accounts={allAccounts}
          containers={combinedData}
          query={query}
          currentPage={currentPage}
        />
      </Suspense>
    </>
  );
}

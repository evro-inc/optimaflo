import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import ContainerTable from '@/src/app/(dashboards)/dashboard/gtm/containers/table';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listAllGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

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
  const combinedContainers = await listAllGtmContainers();
  const allAccounts = await listGtmAccounts();

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
          containers={combinedContainers}
          query={query}
          currentPage={currentPage}
        />
      </Suspense>
    </>
  );
}

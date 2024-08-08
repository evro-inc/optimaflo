import React, { Suspense } from 'react';
import { DataTable } from '@/src/app/(dashboards)/dashboard/gtm/entities/@containers/table';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';

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

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();

  const [accounts, containers] = await Promise.all([accountData, containerData]);

  const combinedData = containers.flat().map((container) => {
    const account = accounts.find((a) => a.accountId === container.accountId);
    if (account) {
      return {
        ...container,
        accountName: account.name,
      };
    } else {
      return {
        ...container,
        accountName: 'Unknown Account',
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

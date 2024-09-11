import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Skeleton } from '@/src/components/ui/skeleton';
import { DataTable } from './table';
import { columns } from './columns';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { listGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';

export default async function StreamPage({
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

  const accountData = await listGaAccounts();
  const accountAccess = await listGAAccessBindings();

  console.log('accountAccess', accountAccess);

  const [accounts] = await Promise.all([accountData]);

  const flatAccounts = accounts.flat();
  const flatAccess = accountAccess
    .filter((item) => item?.accessBindings && item.accessBindings.length > 0)
    .map((item) => item.accessBindings);

  console.log('flatAccess', flatAccess);

  const combinedData = flatAccess.flatMap((group) =>
    group.map((access) => {
      // Split the 'name' to extract specific parts, if needed
      const parts = access.name.split('/');
      const accountId = parts[1];
      const accessBindingId = parts[3];
      const accountName =
        flatAccounts.find((account) => account.name.split('/')[1] === accountId)?.displayName ||
        'Account Name Unknown';

      // Return a new object with desired structure or processed data
      return {
        name: access.name,
        accountName,
        accountId,
        accessBindingId,
        user: access.user,
        roles: access.roles, // Assuming you want to directly use the roles array
      };
    })
  );

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
          <DataTable columns={columns} data={combinedData} parentData={accounts} />
        </div>
      </Suspense>
    </>
  );
}

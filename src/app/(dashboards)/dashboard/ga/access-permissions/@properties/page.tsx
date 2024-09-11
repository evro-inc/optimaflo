import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Skeleton } from '@/src/components/ui/skeleton';
import { DataTable } from './table';
import { columns } from './columns';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { listGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/propertyPermissions';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';

export default async function PropertyAccessPage({
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
  const propertyData = await listGAProperties();
  const access = await listGAAccessBindings();

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  console.log('tprps', properties);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flatAccess = access.map((item) => item.accessBindings);

  console.log('flatAccounts perm', flatAccounts);
  console.log('flatProperties perm', flatProperties);

  const combinedData = flatAccess.flatMap((group) =>
    group.map((access) => {
      const propertyId = access.name.split('/')[1];

      console.log('propertyId perm', propertyId);

      const parts = access.name.split('/');
      const accessBindingId = parts[3];

      // Find the property and make sure to check if it exists before accessing its name
      const property = flatProperties.find(
        (property) => property?.name?.split('/')[1] === propertyId
      );

      console.log('property 3', property);

      // Find the account using the property parent, ensuring property is defined
      const account = flatAccounts.find((acc) => acc.name === property?.parent);

      const accountName = account ? account.displayName : 'Account Name Unknown';
      const propertyName = property ? property.displayName : 'Property Name Unknown';

      return {
        name: access.name,
        accountName,
        accessBindingId,
        user: access.user,
        roles: access.roles,
        property: propertyName,
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

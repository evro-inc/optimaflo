import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Skeleton } from '@/src/components/ui/skeleton';
import { DataTable } from './table';
import { columns } from './columns';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';

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
  const propertyData = await listGAProperties();

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  const flatAccounts = accounts.flat();

  console.log("z x", properties);


  // Make sure you access the 'properties' field of propertyData correctly
  const flatProperties = properties.map((propertyObj) => propertyObj);

  // Filter out any undefined values from flatProperties
  const validProperties = flatProperties.filter(property => property !== undefined);

  const combinedData = validProperties.map((property) => {
    // Find the matching account
    const account = flatAccounts.find((a) => a.name === property.parent);

    // Transformation functions
    const extractId = (path) => path.split('/')[1];
    const formatType = (propertyType) => {
      if (!propertyType) return 'Unknown'; // Check if propertyType is undefined

      // Split the string into parts based on underscores
      const parts = propertyType.split('_');

      // Take the last part of the split string, which should be "ORDINARY" in your example
      const lastPart = parts[parts.length - 1];

      // Convert that part to lowercase, then capitalize the first letter
      return lastPart[0].toUpperCase() + lastPart.slice(1).toLowerCase();
    };

    // Apply transformations
    return {
      ...property,
      name: extractId(property.name), // Transforming the 'name' property
      parent: property.parent ? extractId(property.parent) : 'Unknown', // Conditional transformation if 'parent' exists
      serviceLevel: formatType(property.serviceLevel), // Transforming the 'serviceLevel'
      propertyType: formatType(property.propertyType), // Transforming the 'propertyType'
      accountName: account ? account.displayName : 'Unknown Account', // Setting 'accountName' from 'flatAccounts' or default

      // Check if dataRetentionSettings exists before accessing its properties
      retention: property.dataRetentionSettings ? property.dataRetentionSettings.eventDataRetention : 'Unknown',
      resetOnNewActivity: property.dataRetentionSettings ? property.dataRetentionSettings.resetUserDataOnNewActivity : false,
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
          <DataTable columns={columns} data={combinedData} parentData={accounts} />
        </div>
      </Suspense>
    </>
  );
}

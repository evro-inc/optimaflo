import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
import { DataTable } from './table';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';

export default async function CustomMetricPage({
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
  const customMetrics = await listGACustomMetrics();

  const [accounts, properties, cm] = await Promise.all([accountData, propertyData, customMetrics]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.map((propertyObj) => propertyObj);

  const combinedData = cm.map((cm) => {
    const propertyId = cm.name.split('/')[1];
    // Check both 'p' and 'p.name' are defined before using '.includes'
    const property = flatProperties.find((p) => p && p.name && p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...cm,
      name: cm.name,
      parameterName: cm.parameterName,
      displayName: cm.displayName,
      scope: cm.scope,
      measurementUnit: cm.measurementUnit,
      property: property ? property.displayName : 'Unknown Property',
      restrictedMetricType: cm.restrictedMetricType,
      account: accounts.length > 0 ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts.length > 0 ? accounts[0].displayName : 'Unknown Account Name',
      disallowAdsPersonalization: cm.scope === 'USER' ? cm.disallowAdsPersonalization : false,
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

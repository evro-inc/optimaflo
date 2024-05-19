import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import { DataTable } from './table';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';

export default async function KeyEventsPage({
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
  const keyEventsData = await listGAKeyEvents();

  console.log('keyEventsData', keyEventsData);

  const [accounts, properties, keyEvents] = await Promise.all([
    accountData,
    propertyData,
    keyEventsData,
  ]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedkeyEvents = keyEventsData
    .flatMap((item) => item.keyEvents)
    .filter((keyEvent) => keyEvent !== undefined);

  const combinedData = flattenedkeyEvents.map((keyEvents) => {
    const propertyId = keyEvents.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));

    const accounts = flatAccounts.find(
      (acc) =>
        acc.name ===
        flatProperties.find((property) => property.name.split('/')[1] === propertyId)?.parent
    );

    const accountName = accounts ? accounts.displayName : 'Account Name Unknown';
    const account = accounts ? accounts.name : 'Account Id Unknown';

    return {
      ...keyEvents,
      account,
      accountName,
      property: property ? property?.displayName : 'Unknown Property Name',
      propertyId: property ? property?.name : 'Unknown Property Id',
      /* displayName: keyEvents.displayName,
      name: keyEvents.name, */
      /*  membershipDurationDays: keyEvents.membershipDurationDays,
       adsPersonalizationEnabled: keyEvents.adsPersonalizationEnabled, */
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

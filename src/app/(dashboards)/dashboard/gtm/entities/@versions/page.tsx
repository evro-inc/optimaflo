import React, { Suspense } from 'react';
import { DataTable } from '@/src/app/(dashboards)/dashboard/gtm/entities/@versions/table';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';
import { columns } from './columns';
import {
  getGTMLatestVersion,
  getGTMLiveVersion,
  listGTMVersionHeaders,
} from '@/src/lib/fetch/dashboard/actions/gtm/versions';

export default async function VersionsPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const { userId } = await auth();
  if (!userId) return notFound();

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const versionData = await listGTMVersionHeaders();
  const latestVersionData = await getGTMLatestVersion();
  const liveVersionData = await getGTMLiveVersion();

  const [accounts, containers, versions, latest, live] = await Promise.all([
    accountData,
    containerData,
    versionData,
    latestVersionData,
    liveVersionData,
  ]);

  const flatContainers = containers.flat();
  const flatVersions = versions.flat();
  const flatLatest = latest.flat();
  const flatLive = live.flat();

  const latestVersionIds = new Set(
    flatLatest.map(
      (v) => `${String(v.accountId)}-${String(v.containerId)}-${String(v.containerVersionId)}`
    )
  );

  const liveVersionIds = new Set(
    flatLive.map(
      (v) => `${String(v.accountId)}-${String(v.containerId)}-${String(v.containerVersionId)}`
    )
  );

  const combinedData = flatVersions.map((vs) => {
    const account = accounts.find((a) => a.accountId === vs.accountId);
    const container = flatContainers.find((c) => c.containerId === vs.containerId);

    // Check for missing IDs
    if (!vs.accountId || !vs.containerId || !vs.containerVersionId) {
      console.warn('Missing IDs in version:', vs);
      return vs; // Skip this version
    }

    // Create the version identifier
    const versionId = `${String(vs.accountId)}-${String(vs.containerId)}-${String(
      vs.containerVersionId
    )}`;

    // Check if this version is among the latest versions
    const isLatest = latestVersionIds.has(versionId);
    const isLive = liveVersionIds.has(versionId);

    // Collect applicable statuses
    const statuses: any = [];
    if (isLatest) statuses.push('latest');
    if (isLive) statuses.push('live');
    if (!isLive && !isLatest) statuses.push('standard');

    return {
      ...vs,
      accountName: account ? account.name : 'Unknown Account',
      containerName: container ? container.name : 'Unknown Container',
      status: statuses.length > 0 ? statuses : undefined,
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
          <DataTable columns={columns} data={combinedData} accounts={accounts} />
        </div>
      </Suspense>
    </>
  );
}

import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import ContainerTable from '@/src/app/(dashboards)/dashboard/gtm/containers/table';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listAllGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { Skeleton } from "@/src/components/ui/skeleton"

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
  const token = await currentUserOauthAccessToken(userId);

  // Fetch
  const combinedContainers = await listAllGtmContainers(token[0].token);
  const allAccounts = await listGtmAccounts(token[0].token);

  return (
    <>
      <Suspense key={query + currentPage} fallback={<Skeleton className="w-[100px] h-[20px] rounded-full" />}>
        <ContainerTable accounts={allAccounts} containers={combinedContainers} query={query} currentPage={currentPage}  />
      </Suspense>
    </>
  );
}

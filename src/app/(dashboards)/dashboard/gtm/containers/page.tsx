import type { Metadata } from 'next';
import React from 'react';
import ContainerTable from '@/src/app/(dashboards)/dashboard/gtm/containers/table';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listAllGtmContainers } from '@/src/lib/fetch/dashboard/gtm/actions/containers';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const { userId } = auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Fetch
  const combinedContainers = await listAllGtmContainers(token[0].token);
  const allAccounts = await listGtmAccounts(token[0].token);

  return (
    <>
      <ContainerTable accounts={allAccounts} containers={combinedContainers} />
    </>
  );
}

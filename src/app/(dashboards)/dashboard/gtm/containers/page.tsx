import type { Metadata } from 'next';
import React from 'react';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmAccounts } from '@/src/lib/actions/accounts';
import { listGtmContainers } from '@/src/lib/actions/containers';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const user = await currentUser();
  if (!user) return notFound();

  // Fetch accounts list
  const accounts = await listGtmAccounts();

  // Fetch containers for each account in parallel
  const containersPromises = accounts.map((account) =>
    listGtmContainers(account.accountId)
  );

  const containersResults = await Promise.all(containersPromises);

  return (
    <>
      <ContainerTable accounts={accounts.data} containers={containersResults} />
    </>
  );
}

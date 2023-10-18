import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { gtmListAccounts } from '@/src/lib/actions/accounts';
import { gtmListContainers } from '@/src/lib/actions/containers';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  //fetch all containers from API
  const [accounts, containers] = await Promise.all([
    gtmListAccounts(),
    gtmListContainers(),
  ]);

  return (
    <>
      <ContainerTable containers={containers} accounts={accounts} />
    </>
  );
}

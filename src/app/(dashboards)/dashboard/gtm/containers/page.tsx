import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { gtmListContainers } from '@/src/lib/fetch/dashboard/gtm/containers';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { gtmListAccounts } from '@/src/lib/fetch/dashboard/gtm/accounts';

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
  const accounts = await gtmListAccounts();
  const containers = await gtmListContainers();

  return (
    <>
      <ContainerTable containers={containers} accounts={accounts} />
    </>
  );
}

import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { gtmListContainers } from '@/src/lib/actions/containers';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;
  const accessToken = await getAccessToken(userId);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  const accountData = listGtmAccounts( userId, accessToken );
  const containerData = gtmListContainers();

  const [accountList, containerList] = await Promise.all([
    accountData,
    containerData,
  ]);

  return (
    <>
      <ContainerTable accounts={accountList} containers={containerList} />
    </>
  );
}

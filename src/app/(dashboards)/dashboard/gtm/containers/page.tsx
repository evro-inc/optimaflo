import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';
import { listGtmContainers } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/route';
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

  // Fetch accounts list
  const accounts = await listGtmAccounts(userId, accessToken);   

  // Fetch containers for each account in parallel
  const containersPromises = accounts.data.map(account => 
    listGtmContainers(userId, accessToken, account.accountId)
  );  

  const containersResults = await Promise.all(containersPromises);
  
  // Flatten the results if necessary
  const containerList = containersResults.map(result => result[0].data).flat();  

  return (
    <>
      <ContainerTable accounts={accounts.data} containers={containerList} />
    </>
  );
}

import type { Metadata } from 'next';
import React from 'react';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { clerkClient, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { gtmListContainers } from '@/src/lib/actions/containers';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const userId = user?.id as string;
  const accessToken = await clerkClient.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  );

  

  // Fetch accounts list
  const accountsData = await listGtmAccounts(userId, accessToken[0].token);
  const accounts = await accountsData.json();

  // Fetch containers for each account in parallel
  const containersPromises = await accounts.data.map(() =>
    gtmListContainers()
  );  

  const containersResults = await Promise.all(containersPromises);

  return (
    <>
      <ContainerTable accounts={accounts.data} containers={containersResults} />
    </>
  );
}

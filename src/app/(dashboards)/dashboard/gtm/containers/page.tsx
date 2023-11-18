import type { Metadata } from 'next';
import React from 'react';
import ContainerTable from '@/src/components/client/GTM/containers/table';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';
import { listGtmContainers } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/route';
import { clerkClient, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function ContainerPage() {
  const user = await currentUser()
  if (!user) return notFound()
  const userId = user?.id;  
  const accessToken = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_google")



  // Fetch accounts list
  const accounts = await listGtmAccounts(userId, accessToken[0].token);

  // Fetch containers for each account in parallel
  const containersPromises = accounts.data.map((account) =>
    listGtmContainers(userId, accessToken[0].token, account.accountId)
  );

  const containersResults = await Promise.all(containersPromises);

  // Flatten the results if necessary
  const containerList = containersResults
    .map((result) => result[0].data)
    .flat();

  return (
    <>
      <ContainerTable accounts={accounts.data} containers={containerList} />
    </>
  );
}

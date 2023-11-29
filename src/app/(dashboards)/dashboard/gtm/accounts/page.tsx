import type { Metadata } from 'next';
import React from 'react';
import AccountTable from '@/src/components/client/GTM/accounts/table';
import { clerkClient, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmContainers } from '@/src/app/api/dashboard/gtm/accounts/[accountId]/containers/route';
import { listGtmAccounts } from '@/src/lib/actions/accounts';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return notFound();
  let allContainers: any[] = [];

  const userId = user?.id as string;
  const accessToken = await clerkClient.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  );

  
  const accounts = await listGtmAccounts(userId, accessToken[0].token);

  const containersPromises = await accounts.map(account => 
    listGtmContainers(userId, accessToken[0].token, account.accountId)
  );
  
  const containersData = await Promise.all(containersPromises);

  containersData.forEach(containerArray => {
    containerArray.forEach(container => {
      allContainers = [...allContainers, ...container.data];
    });
  });

  
  await Promise.all([accounts, allContainers]);

  return (
    <>
      <h1>Account</h1>

      <AccountTable />
    </>
  );
}

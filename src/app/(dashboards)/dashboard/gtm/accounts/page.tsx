import type { Metadata } from 'next';
import React from 'react';
import AccountTable from '@/src/components/client/GTM/accounts/table';
import { currentUser, clerkClient } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmAccounts } from '@/src/app/api/dashboard/gtm/accounts/route';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return notFound();
  const userId = user?.id;
  const accessToken = await clerkClient.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  );

  const accounts = await listGtmAccounts(userId, accessToken[0].token);
  const accountList = accounts.data || [];

  return (
    <>
      <h1>Account</h1>

      <AccountTable accounts={accountList} />
    </>
  );
}

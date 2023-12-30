import type { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import AccountTable from './table';
import { auth } from '@clerk/nextjs';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const { userId } = auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const accounts = await listGtmAccounts(token[0].token);

  return (
    <>
      <AccountTable accounts={accounts} />
    </>
  );
}

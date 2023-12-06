import type { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import AccountTable from './table';
import { auth } from '@clerk/nextjs';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { listGtmAccounts } from '@/src/lib/actions/accounts';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

async function getAccounts() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();
    const token = await currentUserOauthAccessToken(userId);
    const accounts = await listGtmAccounts(token[0].token);
    

    return { props: { accounts } };
  } catch (error: any) {
    console.error('Error fetching accounts:', error.message);
    return { props: { accounts: [], totalPages: 0 } }; // Return empty array and 0 totalPages in case of error
  }
}

export default async function AccountPage() {
    const { userId } = auth();
    if (!userId) return notFound();
    const data = await getAccounts();
  return (
    <>
      <AccountTable accounts={data.props.accounts} />
    </>
  );
}

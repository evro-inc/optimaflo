import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import AccountTable from '@/src/components/client/GTM/accounts/table';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  return (
    <>
      <h1>Account</h1>

      <AccountTable />
    </>
  );
}

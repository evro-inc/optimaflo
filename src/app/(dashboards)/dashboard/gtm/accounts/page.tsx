import type { Metadata } from 'next';
import React from 'react';
import AccountTable from '@/src/components/client/GTM/accounts/table';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  return (
    <>
      <h1>Account</h1>

      <AccountTable />
    </>
  );
}

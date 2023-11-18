import type { Metadata } from 'next';
import React from 'react';
import { redirect } from 'next/navigation';
import AccountTable from '@/src/components/client/GTM/accounts/table';
import { useAuth } from "@clerk/nextjs";

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

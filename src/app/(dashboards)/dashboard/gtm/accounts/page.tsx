import type { Metadata } from 'next';
import React from 'react';
import { currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import AccountTable from './table';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <AccountTable />
    </>
  );
}

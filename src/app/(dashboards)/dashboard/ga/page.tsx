import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function GAPage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  try {
    const content = (
      <div>
        <h1>GA4 Accounts</h1>
      </div>
    );

    return content;
  } catch (error: any) {
    console.error('Error in gaListAccounts:', error.message);
  }
}

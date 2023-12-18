import type { Metadata } from 'next';
import React from 'react';

import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function GAPage() {
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

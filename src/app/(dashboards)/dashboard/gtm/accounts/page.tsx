import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import AccountTable from './table';
import { auth } from '@clerk/nextjs';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { Skeleton } from '@/src/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const { userId } = auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const accounts = await listGtmAccounts(token[0].token);

  return (
    <>
    <Suspense key={query + currentPage} fallback={<Skeleton className="w-[100px] h-[20px] rounded-full" />}>
      <AccountTable accounts={accounts} query={query} currentPage={currentPage}  />
    </Suspense>
    </>
  );
}

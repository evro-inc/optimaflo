'use server';
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import GATos from './client';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';

export default async function Page() {
  const { userId } = auth();
  if (!userId) return notFound();

  const tokenData = await currentUserOauthAccessToken(userId);
  const token = tokenData[0].token;


  return (
    <div className="container mx-auto py-10">
      <GATos token={token} />
    </div>
  );
}

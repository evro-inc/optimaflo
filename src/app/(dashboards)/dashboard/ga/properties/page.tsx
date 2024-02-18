import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import Link from 'next/link';

export default async function Page() {
  const { userId } = auth();
  if (!userId) return notFound();

  return (
    <>
      <h1>GA4 Properties</h1>
    </>
  );
}

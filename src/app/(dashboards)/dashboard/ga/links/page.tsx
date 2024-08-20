import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import RefreshGA from '@/src/components/client/GA/refresh';

export default async function Page() {
  const { userId } = auth();
  if (!userId) return notFound();

  return (
    <div className="container mx-auto py-10 flex items-center justify-between">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Links
      </h1>
      <RefreshGA gaPath="links" />
    </div>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import FormUpdateStream from './form';

export default async function UpdateStreamPage() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateStream />
      </div>
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import FormUpdateVersion from './form';

export default async function UpdateVersionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateVersion />
      </div>
    </>
  );
}

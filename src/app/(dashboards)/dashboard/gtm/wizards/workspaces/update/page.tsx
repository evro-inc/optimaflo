import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateWorkspace from './form';

export default async function UpdateContainerPage() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateWorkspace />
      </div>
    </>
  );
}

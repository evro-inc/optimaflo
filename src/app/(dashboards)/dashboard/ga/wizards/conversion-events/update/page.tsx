import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import FormUpdateCustomMetric from './form';

export default async function UpdateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateCustomMetric />
      </div>
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import FormUpdatePropertyAccess from './form';

export default async function UdpateAccountAccess() {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdatePropertyAccess />
      </div>
    </>
  );
}

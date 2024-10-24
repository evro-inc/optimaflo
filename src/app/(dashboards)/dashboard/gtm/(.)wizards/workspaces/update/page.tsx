import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateWorkspace from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';

export default async function UpdateWorkspacePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateWorkspace tierLimits={tierLimits} />
      </div>
    </>
  );
}

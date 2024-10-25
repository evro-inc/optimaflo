import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateKeyEvents from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';

export default async function UpdateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GA4KeyEvents'
  );
  const updateLimit = foundTierLimit?.updateLimit || 0;
  const updateUsage = foundTierLimit?.updateUsage || 0;
  const remainingCreate = updateLimit - updateUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/ga/properties'); // Replace with the actual path you want to redirect to
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateKeyEvents />
      </div>
    </>
  );
}

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import FormUpdateVariables from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';

export default async function UpdateVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  console.log('tierLimits', tierLimits);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMVariables'
  );

  console.log('foundTierLimit', foundTierLimit);

  const updateLimit = foundTierLimit?.updateLimit || 0;
  const updateUsage = foundTierLimit?.updateUsage || 0;
  const remainingCreate = updateLimit - updateUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/gtm/configurations'); // Replace with the actual path you want to redirect to
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateVariables />
      </div>
    </>
  );
}

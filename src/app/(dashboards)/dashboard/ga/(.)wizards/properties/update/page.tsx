import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateProperty from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { redirect } from 'next/navigation';

export default async function UpdatePropertyPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const ga4PropertiesTier = tierLimits.find((tier) => tier.Feature.name === 'GA4Properties');

  const updateLimit = ga4PropertiesTier.updateLimit;
  const updateUsage = ga4PropertiesTier.updateUsage;
  const remaining = updateLimit - updateUsage;

  if (remaining <= 0) {
    redirect('/dashboard/ga/properties');
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateProperty tierLimits={tierLimits} />
      </div>
    </>
  );
}

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateCustomMetric from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';

export default async function UpdateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const ga4Tier = tierLimits.find((tier) => tier.Feature.name === 'GA4CustomMetrics');

  const updateLimit = ga4Tier.updateLimit;
  const updateUsage = ga4Tier.updateUsage;
  const remaining = updateLimit - updateUsage;

  if (remaining <= 0) {
    redirect('/dashboard/ga/properties');
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateCustomMetric tierLimits={tierLimits} />
      </div>
    </>
  );
}

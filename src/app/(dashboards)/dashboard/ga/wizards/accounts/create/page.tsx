import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateAccount from './form';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;
  const tierLimits = await getTierLimit(subscriptionId);
  const [limits] = await Promise.all([tierLimits]);

  const accountLimit = limits.find((limit) => limit.Feature.name === 'GA4Accounts');
  const propertyLimit = limits.find((limit) => limit.Feature.name === 'GA4Properties');
  const accountAccessLimit = limits.find((limit) => limit.Feature.name === 'GA4AccountAccess');

  if (accountLimit.createUsage >= accountLimit.createLimit) {
    redirect('/dashboard/ga/accounts');
  }
  if (propertyLimit.createUsage >= propertyLimit.createLimit) {
    redirect('/dashboard/ga/accounts');
  }
  if (accountAccessLimit.createUsage >= accountAccessLimit.createLimit) {
    redirect('/dashboard/ga/accounts');
  }

  return (
    <>
      <div className="container">
        <FormCreateAccount tierLimits={limits} />
      </div>
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
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

  return (
    <>
      <div className="container">
        <FormCreateAccount tierLimits={limits} />
      </div>
    </>
  );
}

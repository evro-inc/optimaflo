import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateAccount from './form';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();

  const [accounts, limits] = await Promise.all([accountData, tierLimits]);

  /*   console.log("Accounts:", accounts);
    console.log("Limits:", limits); */

  return (
    <>
      <div className="container">
        <FormCreateAccount tierLimits={limits} />
      </div>
    </>
  );
}

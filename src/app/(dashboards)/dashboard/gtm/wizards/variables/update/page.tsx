import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateVariables from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { fetchGtmData, processEntityData, processGtmData } from '../components/utils';

export default async function UpdateVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const { accountData, containerData, workspaceData } = await fetchGtmData();

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateVariables
          tierLimits={tierLimits}
          accounts={accountData}
          containers={containerData}
          workspaces={workspaceData}
        />
      </div>
    </>
  );
}

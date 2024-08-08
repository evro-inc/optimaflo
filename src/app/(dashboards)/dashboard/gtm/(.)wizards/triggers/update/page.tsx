import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateVariables from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { fetchGtmData, processEntityData, processGtmTriggerData } from '../components/utils';

export default async function UpdateVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMTriggers'
  );

  const updateLimit = foundTierLimit?.updateLimit || 0;
  const updateUsage = foundTierLimit?.updateUsage || 0;
  const remainingCreate = updateLimit - updateUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/gtm/configurations'); // Replace with the actual path you want to redirect to
  }

  const { accountData, containerData, workspaceData, triggerData } = await fetchGtmData();
  const combinedData = processGtmTriggerData(
    accountData,
    containerData,
    workspaceData,
    triggerData
  );
  const entityData = processEntityData(accountData, containerData, workspaceData);

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateVariables data={entityData} />
      </div>
    </>
  );
}

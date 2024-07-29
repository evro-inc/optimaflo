import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateVariable from './form';
import { fetchGtmData, processEntityData, processGtmData } from '../components/utils';

export default async function CreateVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMVariables'
  );
  const createLimit = foundTierLimit?.createLimit || 0;
  const createUsage = foundTierLimit?.createUsage || 0;
  const remainingCreate = createLimit - createUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/gtm/configurations');
  }

  const { accountData, containerData, workspaceData, varData } = await fetchGtmData();
  const combinedData = processGtmData(accountData, containerData, workspaceData, varData);
  const entityData = processEntityData(accountData, containerData, workspaceData);

  return (
    <>
      <div className="container">
        <FormCreateVariable tierLimits={tierLimits} table={combinedData} data={entityData} />
      </div>
    </>
  );
}


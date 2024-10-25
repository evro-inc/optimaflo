import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import FormUpdateVariables from './form';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { fetchGtmData, processGtmTagData } from '../../tags/components/utils';

export default async function UpdateVariablePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const { accountData, containerData, workspaceData, tagData } = await fetchGtmData();
  const combinedData = processGtmTagData(accountData, containerData, workspaceData, tagData);

  return (
    <>
      <div className="container mx-auto py-10">
        <FormUpdateVariables table={combinedData} tierLimits={tierLimits} />
      </div>
    </>
  );
}

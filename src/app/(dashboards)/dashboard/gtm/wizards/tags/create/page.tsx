import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateTag from './form';
import { fetchGtmData, processGtmTagData } from '../components/utils';

export default async function CreateTagPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const { accountData, containerData, workspaceData, tagData } = await fetchGtmData();
  const combinedData = processGtmTagData(accountData, containerData, workspaceData, tagData);

  return (
    <>
      <div className="container">
        <FormCreateTag
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accountData}
          containers={containerData}
          workspaces={workspaceData}
        />
      </div>
    </>
  );
}

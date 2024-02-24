import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateContainer from './form';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';

export default async function CreateStreamPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();

  const [accounts, containers] = await Promise.all([accountData, containerData]);

  const combinedData = containers.flat().map((container) => {
    const account = accounts.find((a) => a.accountId === container.accountId);
    if (account) {
      return {
        ...container,
        accountName: account.name,
      };
    } else {
      return {
        ...container,
        accountName: 'Unknown Account',
      };
    }
  });

  return (
    <>
      <div className="container mx-auto py-10">
        <FormCreateContainer tierLimits={tierLimits} table={combinedData} accounts={accounts} />
      </div>
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateKeyEvents from './form';
import { listGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';

export default async function CreateKeyEventsPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const keyEventsData = await listGAKeyEvents();

  const [accounts, properties, ke] = await Promise.all([accountData, propertyData, keyEventsData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();

  const combinedData = ke.map((keyEvents) => {
    const propertyId = keyEvents.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));

    const accounts = flatAccounts.find(
      (acc) =>
        acc.name ===
        flatProperties.find((property) => property.name.split('/')[1] === propertyId)?.parent
    );

    const accountName = accounts ? accounts.displayName : 'Account Name Unknown';
    const account = accounts ? accounts.name : 'Account Id Unknown';

    return {
      ...keyEvents,
      account,
      accountName,
      property: property ? property?.displayName : 'Unknown Property Name',
      propertyId: property ? property?.name : 'Unknown Property Id',
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateKeyEvents
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

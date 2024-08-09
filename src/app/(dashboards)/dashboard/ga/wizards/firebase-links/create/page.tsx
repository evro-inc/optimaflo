import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateFBLink from './form';
import { listGAFirebaseLinks } from '@/src/lib/fetch/dashboard/actions/ga/links';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const firebaseLinkData = await listGAFirebaseLinks();

  const [accounts, properties] = await Promise.all([accountData, propertyData, firebaseLinkData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flatFirebaseLinks = firebaseLinkData.flatMap((item) => item.firebaseLinks || []);

  const combinedData = flatFirebaseLinks.map((fb) => {
    const propertyId = fb.name.split('/')[1];

    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...fb,
      account: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
      property: property.displayName,
      name: fb.name,
      project: fb.project,
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateFBLink
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

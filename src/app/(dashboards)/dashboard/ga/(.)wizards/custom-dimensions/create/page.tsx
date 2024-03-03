import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateCustomDimension from './form';
import { listGACustomDimensions } from '@/src/lib/fetch/dashboard/actions/ga/dimensions';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const customDimensions = await listGACustomDimensions();

  const [accounts, properties, cd] = await Promise.all([
    accountData,
    propertyData,
    customDimensions,
  ]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedCustomDimensions = cd
    .filter((item) => item.customDimensions) // Filter out objects without customDimensions
    .flatMap((item) => item.customDimensions);

  const combinedData = flattenedCustomDimensions.map((cd) => {
    const propertyId = cd.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...cd,
      name: cd.name,
      parameterName: cd.parameterName,
      displayName: cd.displayName,
      property: property.displayName,
      accountId: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateCustomDimension
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

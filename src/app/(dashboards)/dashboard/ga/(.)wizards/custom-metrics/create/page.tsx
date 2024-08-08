import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateCustomMetric from './form';
import { listGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const customMetrics = await listGACustomMetrics();

  const [accounts, properties, cm] = await Promise.all([accountData, propertyData, customMetrics]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedCustomMetrics = cm
    .filter((item) => item.customMetrics) // Filter out objects without customMetrics
    .flatMap((item) => item.customMetrics);

  const combinedData = flattenedCustomMetrics.map((cm) => {
    const propertyId = cm.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...cm,
      name: cm.name,
      parameterName: cm.parameterName,
      displayName: cm.displayName,
      scope: cm.scope,
      measurementUnit: cm.measurementUnit,
      property: property.displayName,
      restrictedMetricType: cm.restrictedMetricType,
      account: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
      disallowAdsPersonalization: cm.scope === 'USER' ? cm.disallowAdsPersonalization : false,
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateCustomMetric
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateConversionEvent from './form';
import { listGACustomMetrics } from '@/src/lib/fetch/dashboard/actions/ga/metrics';
import { listGAConversionEvents } from '@/src/lib/fetch/dashboard/actions/ga/conversions';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const conversionEvent = await listGAConversionEvents();

  const [accounts, properties, ce] = await Promise.all([
    accountData,
    propertyData,
    conversionEvent,
  ]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedConversionEvent = ce.flatMap((item) => item.conversionEvents || []);

  const combinedData = flattenedConversionEvent.map((ce) => {
    const propertyId = ce.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    const deletable = ce.deletable === true ? true : false;
    const custom = ce.custom === true ? true : false;

    return {
      ...ce,
      account: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
      property: property.displayName,
      name: ce.name,
      eventName: ce.eventName,
      countingMethod: ce.countingMethod,
      defaultConversionValue: ce.defaultConversionValue,
      deletable: deletable,
      custom: custom,
    };
  });

  return (
    <>
      <div className="container">
        <FormCreateConversionEvent
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

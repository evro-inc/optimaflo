import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { dataStreamTypeMapping } from '../../../properties/@streams/streamItems';
import FormCreateStream from './form';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';

export default async function CreateStreamPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const streamData = await listGAPropertyStreams();

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();

  const combinedData = flatProperties.map((property) => {
    // Find the matching account
    const account = flatAccounts.find((a) => a.name === property.parent);

    // Transformation functions
    const extractId = (path) => path.split('/')[1];
    const formatType = (propertyType) => {
      // Split the string into parts based on underscores
      const parts = propertyType.split('_');

      // Take the last part of the split string, which should be "ORDINARY" in your example
      const lastPart = parts[parts.length - 1];

      // Convert that part to lowercase, then capitalize the first letter
      return lastPart[0] + lastPart.slice(1).toLowerCase();
    };

    // Apply transformations
    return {
      ...property,
      name: extractId(property.name), // Transforming the 'name' property
      parent: property.parent ? extractId(property.parent) : 'Unknown', // Conditional transformation if 'parent' exists
      serviceLevel: formatType(property.serviceLevel), // Transforming the 'serviceLevel'
      propertyType: formatType(property.propertyType), // Transforming the 'propertyType'
      accountName: account ? account.displayName : 'Unknown Account', // Setting 'accountName' from 'flatAccounts' or default
      retention: property.dataRetentionSettings.eventDataRetention,
      resetOnNewActivity: property.dataRetentionSettings.resetUserDataOnNewActivity || false,
    };
  });

  return (
    <>
      <div className="container mx-auto py-10">
        <FormCreateStream
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

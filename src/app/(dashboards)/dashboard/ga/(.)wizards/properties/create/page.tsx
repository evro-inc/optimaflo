import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import FormCreateProperty from './form';
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

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();

  const combinedData = flatProperties.map((property) => {
    // Find the matching account
    const account = flatAccounts.find((a) => a.name === property.parent);

    // Transformation functions with null/undefined checks
    const extractId = (path) => (path ? path.split('/')[1] : 'Unknown');
    const formatType = (propertyType) => {
      if (!propertyType) return 'Unknown'; // Return 'Unknown' if propertyType is undefined

      // Split the string into parts based on underscores
      const parts = propertyType.split('_');

      // Take the last part of the split string, which should be "ORDINARY" in your example
      const lastPart = parts[parts.length - 1];

      // Convert that part to lowercase, then capitalize the first letter
      return lastPart[0].toUpperCase() + lastPart.slice(1).toLowerCase();
    };

    // Apply transformations with checks for undefined properties
    return {
      ...property,
      name: extractId(property.name), // Safely transform the 'name' property
      parent: property.parent ? extractId(property.parent) : 'Unknown', // Conditional transformation if 'parent' exists
      serviceLevel: formatType(property.serviceLevel), // Safely transform the 'serviceLevel'
      propertyType: formatType(property.propertyType), // Safely transform the 'propertyType'
      accountName: account ? account.displayName : 'Unknown Account', // Set 'accountName' from 'flatAccounts' or default
      retention: property.dataRetentionSettings?.eventDataRetention || 'Unknown', // Safely access nested property
      resetOnNewActivity: property.dataRetentionSettings?.resetUserDataOnNewActivity || false, // Safely access nested property
    };
  });

  return (
    <>
      <div className="container mx-auto py-10">
        <FormCreateProperty
          tierLimits={tierLimits}
          table={combinedData}
          accounts={flatAccounts}
          properties={flatProperties}
        />
      </div>
    </>
  );
}

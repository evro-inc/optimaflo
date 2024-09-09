import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import FormCreateProperty from './form';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';

export default async function CreatePropertyPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flatMap(item => item.properties);
  const validProperties = flatProperties.filter(property => property != null);

  const combinedData = validProperties
    .filter((property) => property !== undefined)  // Filter out any undefined entries
    .map((property) => {

      // Find the matching account
      const account = flatAccounts.find((a) => a.name === property.parent);

      // Transformation functions with null/undefined checks
      const extractId = (path) => (path ? path.split('/')[1] : 'Unknown');
      const formatType = (propertyType) => {
        if (!propertyType) return 'Unknown'; // Return 'Unknown' if propertyType is undefined

        const parts = propertyType.split('_');
        const lastPart = parts[parts.length - 1];
        return lastPart[0].toUpperCase() + lastPart.slice(1).toLowerCase();
      };

      return {
        ...property,
        name: extractId(property.name),
        parent: property.parent ? extractId(property.parent) : 'Unknown',
        serviceLevel: formatType(property.serviceLevel),
        propertyType: formatType(property.propertyType),
        accountName: account ? account.displayName : 'Unknown Account',
        retention: property.dataRetentionSettings?.eventDataRetention || 'Unknown',
        resetOnNewActivity: property.dataRetentionSettings?.resetUserDataOnNewActivity || false,
      };
    });

  return (
    <>
      <div className="container mx-auto py-10">
        <FormCreateProperty
          tierLimits={tierLimits}
          table={combinedData}
          data={accounts}
        />
      </div>
    </>
  );
}

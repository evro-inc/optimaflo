import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import {
  getMetadataProperties,
  listGAProperties,
} from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateAudience from './form';
import { listGAAudiences } from '@/src/lib/fetch/dashboard/actions/ga/audiences';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const audienceData = await listGAAudiences();
  const propertyMetaData = await getMetadataProperties();

  const allDimensions = propertyMetaData.flatMap(
    (property) => property.dataRetentionSettings.dimensions
  );

  const allMetrics = propertyMetaData.flatMap((property) => property.dataRetentionSettings.metrics);

  // Get unique dimensions
  const uniqueDimensions = Array.from(new Set(allDimensions));
  const uniqueMetrics = Array.from(new Set(allMetrics));

  const [accounts, properties] = await Promise.all([
    accountData,
    propertyData,
    audienceData,
  ]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedaudience = audienceData.flatMap((item) => item.audiences).filter(audience => audience);

  const combinedDataAudiences = flattenedaudience.map((audience) => {
    const propertyId = audience.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));

    const accounts = flatAccounts.find(
      (acc) =>
        acc.name ===
        flatProperties.find((property) => property.name.split('/')[1] === propertyId)?.parent
    );

    const accountName = accounts ? accounts.displayName : 'Account Name Unknown';
    const accountId = accounts ? accounts.name : 'Account Id Unknown';

    return {
      ...audience,
      accountId,
      accountName,
      property: property ? property?.displayName : 'Unknown Property Name',
      propertyId: property ? property?.name : 'Unknown Property Id',
      displayName: audience.displayName,
      name: audience.name,
      membershipDurationDays: audience.membershipDurationDays,
      adsPersonalizationEnabled: audience.adsPersonalizationEnabled,
    };
  });



  return (
    <>
      <div className="container overflow-auto">
        <FormCreateAudience
          tierLimits={tierLimits}
          table={combinedDataAudiences}
          accounts={accounts}
          properties={properties}
          dimensions={uniqueDimensions}
          metrics={uniqueMetrics}
        />
      </div>
    </>
  );
}

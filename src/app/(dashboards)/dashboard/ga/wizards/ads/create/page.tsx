import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateConversionEvent from './form';
import { listGAGoogleAdsLinks } from '@/src/lib/fetch/dashboard/actions/ga/ads';

export default async function CreateCustomDimensionPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const adLink = await listGAGoogleAdsLinks();

  const [accounts, properties] = await Promise.all([accountData, propertyData, adLink]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flattenedAds = adLink.flatMap((item) => item.googleAdsLinks || []);

  const combinedData = flattenedAds.map((ad) => {
    const propertyId = ad.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...ad,
      account: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
      property: property.displayName,
      name: ad.name,
      customerId: ad.customerId,
      canManageClients: ad.canManageClients,
      adsPersonalizationEnabled: ad.adsPersonalizationEnabled,
      creatorEmailAddress: ad.creatorEmailAddress,
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

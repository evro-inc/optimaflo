import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs';
import { Skeleton } from '@/src/components/ui/skeleton';

import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { listGAPropertyStreams } from '@/src/lib/fetch/dashboard/actions/ga/streams';

import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { dataStreamTypeMapping } from '../../../properties/@streams/streamItems';
import FormUpdateStream from './form';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';

export default async function UpdateStreamPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);
  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const streamData = await listGAPropertyStreams();

  console.log("streamData", streamData);
  

  const [accounts, properties, streams] = await Promise.all([
    accountData,
    propertyData,
    streamData,
  ]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const dataStreamsArray = streams
    .filter((stream) => stream.dataStreams)
    .flatMap((stream) => stream.dataStreams)
    .flat();

  const combinedData = dataStreamsArray.map((stream) => {
    const propertyId = stream.name.split('/')[1];
    const property = flatProperties.find((p) => p.name.includes(propertyId));
    const accounts = flatAccounts.filter((a) => a.name === property?.parent);

    return {
      ...stream,
      name: stream.name,
      type: stream.type,
      typeDisplayName: dataStreamTypeMapping[stream.type],
      parent: property.name,
      createTime: stream.createTime,
      updateTime: stream.updateTime,
      displayName: stream.displayName,
      property: property.displayName,
      accountId: accounts ? accounts[0].name : 'Unknown Account ID',
      accountName: accounts ? accounts[0].displayName : 'Unknown Account Name',
    };
  });

  console.log("tierLimits: ", tierLimits);
  console.log("accounts: ", accounts);
  console.log("properties: ", properties);
  console.log("combinedData: ", combinedData);
  

  return (
    <>
      <div className="container mx-auto py-10">
        {/* <FormUpdateStream accounts={accounts} properties={properties} table={combinedData} /> */}
        <FormUpdateStream
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

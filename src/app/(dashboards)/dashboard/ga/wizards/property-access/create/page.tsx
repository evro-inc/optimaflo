import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreatePropertyAccess from './form';
import { listGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';
import { listGAProperties } from '@/src/lib/fetch/dashboard/actions/ga/properties';

export default async function CreateAccountAccessPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const propertyData = await listGAProperties();
  const access = await listGAAccessBindings();

  const [accounts, properties] = await Promise.all([accountData, propertyData]);

  const flatAccounts = accounts.flat();
  const flatProperties = properties.flat();
  const flatAccess = access.map((item) => item.accessBindings);

  const combinedData = flatAccess.flatMap((group) =>
    group.map((access) => {
      const propertyId = access.name.split('/')[1];
      const parts = access.name.split('/');
      const accessBindingId = parts[3];

      const account = flatAccounts.find(
        (acc) =>
          acc.name ===
          flatProperties.find((property) => property.name.split('/')[1] === propertyId)?.parent
      );

      const accountName = account ? account.displayName : 'Account Name Unknown';
      const propertyName = flatProperties.find(
        (property) => property.name.split('/')[1] === propertyId
      );

      return {
        name: access.name,
        accountName,
        accessBindingId,
        user: access.user,
        roles: access.roles,
        property: propertyName?.displayName || 'Property Name Unknown',
      };
    })
  );

  return (
    <>
      <div className="container">
        <FormCreatePropertyAccess
          tierLimits={tierLimits}
          table={combinedData}
          accounts={accounts}
          properties={properties}
        />
      </div>
    </>
  );
}

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/actions/gtm/accounts';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/gtm/containers';
import FormUpdatePermissions from './form';
import { listGtmPermissions } from '@/src/lib/fetch/dashboard/actions/gtm/permissions';

export default async function PermissionsFormPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);
  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const foundTierLimit = tierLimits.find(
    (subscription) => subscription.Feature?.name === 'GTMPermissions'
  );
  const createLimit = foundTierLimit?.createLimit || 0;
  const createUsage = foundTierLimit?.createUsage || 0;
  const remainingCreate = createLimit - createUsage;

  if (remainingCreate <= 0) {
    redirect('/dashboard/gtm/entities');
  }

  const accountData = await listGtmAccounts();
  const containerData = await listGtmContainers();
  const permissionData = await listGtmPermissions();

  const [accounts, containers, permissions] = await Promise.all([
    accountData,
    containerData,
    permissionData,
  ]);

  const flatPermissions = permissions.flatMap((item) => item);
  const flatContainers = containers.flat();

  const combinedData = flatPermissions.flatMap((prop) => {
    const account = accounts.find((a) => a.accountId === prop.accountId);

    return prop.containerAccess.map((containerAccess) => {
      const container = flatContainers.find((c) => c.containerId === containerAccess.containerId);

      return {
        ...prop,
        accountName: account ? account.name : 'Unknown Account',
        containerAccess: containerAccess,
        containerName: container ? container.name : 'Unknown Container',
      };
    });
  });

  const accountIdsWithContainers = new Set(combinedData.map((permission) => permission.accountId));

  const accountsWithContainers = accounts.filter((account) =>
    accountIdsWithContainers.has(account.accountId)
  );

  console.log('combinedData 5', combinedData);

  return (
    <>
      <div className="container">
        <FormUpdatePermissions
          tierLimits={tierLimits}
          table={combinedData}
          containers={flatContainers}
        />
      </div>
    </>
  );
}

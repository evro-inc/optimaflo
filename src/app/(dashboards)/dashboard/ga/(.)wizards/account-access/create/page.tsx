import React from 'react';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';
import { getTierLimit } from '@/src/lib/fetch/tierLimit';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import FormCreateAccountAccess from './form';
import { listGAAccessBindings } from '@/src/lib/fetch/dashboard/actions/ga/accountPermissions';

export default async function CreateAccountAccessPage() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  const subscriptionId = subscription.id;

  const tierLimits = await getTierLimit(subscriptionId);

  const accountData = await listGaAccounts();
  const accountAccess = await listGAAccessBindings();

  const [accounts] = await Promise.all([accountData]);

  const flatAccounts = accounts.flat();
  const flatAccess = accountAccess.map((item) => item.accessBindings);

  const combinedData = flatAccess.flatMap((group) =>
    group.map((access) => {
      // Split the 'name' to extract specific parts, if needed
      const parts = access.name.split('/');
      const accountId = parts[1];
      const accessBindingId = parts[3];
      const accountName =
        flatAccounts.find((account) => account.name.split('/')[1] === accountId)?.displayName ||
        'Account Name Unknown';

      // Return a new object with desired structure or processed data
      return {
        name: access.name,
        accountName,
        accountId,
        accessBindingId,
        user: access.user,
        roles: access.roles, // Assuming you want to directly use the roles array
      };
    })
  );

  return (
    <>
      <div className="container">
        <FormCreateAccountAccess tierLimits={tierLimits} table={combinedData} accounts={accounts} />
      </div>
    </>
  );
}

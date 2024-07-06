//API HELPERS
import prisma from '@/src/lib/prisma';
import { clerkClient } from '@clerk/nextjs';

export function isErrorWithStatus(error: unknown): error is { status: number } {
  return (error as { status: number }).status !== undefined;
}

export function cleanWorkspaceFeatures(workspaces: any[] | undefined) {
  return workspaces?.map((workspace: { [x: string]: any; features: any }) => {
    const { ...cleanedWorkspace } = workspace;
    return cleanedWorkspace;
  });
}

/* GTM UTILS */
export async function grantProductAccess(customerId: string) {
  // Fetch user ID using the Stripe Customer ID
  const customerRecord = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: customerId,
    },
  });

  if (!customerRecord) {
    throw new Error('Customer record not found');
  }

  const userId = customerRecord.userId;

  // Get the product IDs for the GTM products - Needs to make IDs from Stripe webhook - see function grantAccessToContent
  const productIds = ['prod_PUV4HNwx8EuHOi', 'prod_PUV5bXKCjMOpz8', 'prod_PUV6oomP5QRnkp'];

  // Iterate over the product IDs
  for (const productId of productIds) {
    // Update the ProductAccess record for this user and product to grant access
    await prisma.productAccess.upsert({
      where: { userId_productId: { userId, productId } },
      update: { granted: true },
      create: { userId, productId, granted: true },
    });
  }
}

export async function fetchGtmSettings(userId: string) {
  // Check if the User record exists
  const existingUser = await prisma.User.findFirst({ where: { id: userId } });

  if (!existingUser) {
    // Create the User record if it doesn't exist
    await prisma.User.create({ data: { id: userId } });
  }

  const token = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
  const tokenValue = token[0].token;
  const headers = { Authorization: `Bearer ${tokenValue}` };

  const existingRecords = await prisma.gtm.findMany({ where: { userId } });
  const existingCompositeKeySet = new Set(
    existingRecords.map((rec) => `${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
  );

  let retries = 0;
  const MAX_RETRIES = 3;
  let success = false;

  const fetchedCompositeKeySet = new Set();

  while (retries < MAX_RETRIES && !success) {
    try {
      // Fetch the list of accounts
      const accountsResponse = await fetch(
        'https://tagmanager.googleapis.com/tagmanager/v2/accounts',
        { headers }
      );
      const accountsData = await accountsResponse.json();
      const accountIds = accountsData.account?.map((account) => account.accountId) || [];

      for (const accountId of accountIds) {
        // Fetch containers for each account
        const containersResponse = await fetch(
          `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
          { headers }
        );
        const containersData = await containersResponse.json();
        const containerIds =
          containersData.container?.map((container) => container.containerId) || [];

        for (const containerId of containerIds) {
          // Fetch workspaces for each container
          const workspacesResponse = await fetch(
            `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`,
            { headers }
          );
          const workspacesData = await workspacesResponse.json();
          const workspaceIds =
            workspacesData.workspace?.map((workspace) => workspace.workspaceId) || [];

          // Inside the loop for workspaceIds
          for (const workspaceId of workspaceIds) {
            const compositeKey = `${accountId}-${containerId}-${workspaceId}`;
            fetchedCompositeKeySet.add(compositeKey);

            if (!existingCompositeKeySet.has(compositeKey)) {
              await prisma.gtm.upsert({
                where: {
                  userId_accountId_containerId_workspaceId: {
                    userId,
                    accountId,
                    containerId,
                    workspaceId,
                  },
                },
                update: {
                  accountId,
                  containerId,
                  workspaceId,
                  User: { connect: { id: userId } },
                },
                create: {
                  accountId,
                  containerId,
                  workspaceId,
                  User: { connect: { id: userId } },
                },
              });
            }
          }
        }
      }

      // Delete records that are no longer present in the fetched data
      const recordsToDelete = existingRecords.filter(
        (rec) =>
          !fetchedCompositeKeySet.has(`${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
      );

      for (const record of recordsToDelete) {
        await prisma.gtm.delete({
          where: {
            userId_accountId_containerId_workspaceId: {
              userId: record.userId,
              accountId: record.accountId,
              containerId: record.containerId,
              workspaceId: record.workspaceId,
            },
          },
        });
      }

      success = true;
    } catch (error: any) {
      if (error.message.includes('Quota exceeded')) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
        retries++;
      } else {
        throw error;
      }
    }
  }
}

/* GA UTILS */

export async function fetchGASettings(userId: string) {
  // Check if the User record exists
  const existingUser = await prisma.User.findFirst({ where: { id: userId } });

  if (!existingUser) {
    // Create the User record if it doesn't exist
    await prisma.User.create({ data: { id: userId } });
  }

  const token = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
  const tokenValue = token[0].token;
  const headers = { Authorization: `Bearer ${tokenValue}` };

  const existingRecords = await prisma.gtm.findMany({ where: { userId } });
  const existingCompositeKeySet = new Set(
    existingRecords.map((rec) => `${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
  );

  let retries = 0;
  const MAX_RETRIES = 3;
  let success = false;

  while (retries < MAX_RETRIES && !success) {
    try {
      // Fetch the list of accounts
      const accountsResponse = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accounts?fields=accounts(name,displayName,regionCode)',
        { headers }
      );
      const accountsData = await accountsResponse.json();

      const accountNames = accountsData.accounts?.map((account) => account.name) || [];

      for (const accountId of accountNames) {
        const uniqueAccountId = accountId.split('/')[1];

        // Fetch containers for each account
        const propertyResponse = await fetch(
          `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/${uniqueAccountId}`,
          { headers }
        );

        const propertyData = await propertyResponse.json();

        const propertyIds =
          propertyData.properties?.map((property) => {
            // Split the property.name at '/' and take the second part ([1]), which is the ID
            return property.name.split('/')[1];
          }) || [];

        for (const propertyId of propertyIds) {
          if (!existingCompositeKeySet.has(`${accountId}-${propertyId}`)) {
            await prisma.ga.upsert({
              where: {
                userId_accountId_propertyId: {
                  userId,
                  accountId,
                  propertyId,
                },
              },
              update: {
                accountId,
                propertyId,
                User: { connect: { id: userId } },
              },
              create: {
                accountId,
                propertyId,
                User: { connect: { id: userId } },
              },
            });
          }
        }
      }
      success = true;
    } catch (error: any) {
      if (error.message.includes('Quota exceeded')) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
        retries++;
      } else {
        throw error;
      }
    }
  }
}

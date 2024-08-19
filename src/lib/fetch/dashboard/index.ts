import prisma from '@/src/lib/prisma';
import { fetchWithRetry } from '@/src/utils/server';
import { currentUserOauthAccessToken } from '../../clerk';

export function isErrorWithStatus(error: unknown): error is { status: number } {
  return (error as { status: number }).status !== undefined;
}

export function cleanWorkspaceFeatures(workspaces: any[] | undefined) {
  return workspaces?.map((workspace: { [x: string]: any; features: any }) => {
    const { ...cleanedWorkspace } = workspace;
    return cleanedWorkspace;
  });
}



export async function fetchGtmSettings(userId: string) {
  const existingUser = await prisma.User.findFirst({ where: { id: userId } });

  if (!existingUser) {
    await prisma.User.create({ data: { id: userId } });
  }

  const token = await currentUserOauthAccessToken(userId);
  const tokenValue = token;
  const headers = { Authorization: `Bearer ${tokenValue}` };

  const existingRecords = await prisma.gtm.findMany({ where: { userId } });
  const existingCompositeKeySet = new Set(
    existingRecords.map((rec) => `${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
  );

  const fetchedCompositeKeySet = new Set();

  try {
    const accountsData = await fetchWithRetry(
      'https://tagmanager.googleapis.com/tagmanager/v2/accounts',
      headers
    );
    const accountIds = accountsData.account?.map((account) => account.accountId) || [];

    for (const accountId of accountIds) {
      const containersData = await fetchWithRetry(
        `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`,
        headers
      );
      const containerIds =
        containersData.container?.map((container) => container.containerId) || [];

      for (const containerId of containerIds) {
        const workspacesData = await fetchWithRetry(
          `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`,
          headers
        );
        const workspaceIds =
          workspacesData.workspace?.map((workspace) => workspace.workspaceId) || [];

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

    const recordsToDelete = existingRecords.filter(
      (rec) => !fetchedCompositeKeySet.has(`${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
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
  } catch (error: any) {
    throw new Error(`Failed to fetch GTM settings: ${error.message}`);
  }
}

/* GA UTILS */

export async function fetchGASettings(userId: string) {
  const existingUser = await prisma.User.findFirst({ where: { id: userId } });

  if (!existingUser) {
    await prisma.User.create({ data: { id: userId } });
  }

  const token = await currentUserOauthAccessToken(userId);
  const tokenValue = token;
  const headers = { Authorization: `Bearer ${tokenValue}` };

  const existingRecords = await prisma.gtm.findMany({ where: { userId } });
  const existingCompositeKeySet = new Set(
    existingRecords.map((rec) => `${rec.accountId}-${rec.containerId}-${rec.workspaceId}`)
  );

  let retries = 0;
  const MAX_RETRIES = 5;
  let success = false;

  while (retries < MAX_RETRIES && !success) {
    try {
      const accountsData = await fetchWithRetry(
        'https://analyticsadmin.googleapis.com/v1beta/accounts?fields=accounts(name,displayName,regionCode)',
        headers
      );

      const accountNames = accountsData.accounts?.map((account) => account.name) || [];

      for (const accountId of accountNames) {
        const uniqueAccountId = accountId.split('/')[1];

        const propertyData = await fetchWithRetry(
          `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/${uniqueAccountId}`,
          headers
        );

        const propertyIds =
          propertyData.properties?.map((property) => property.name.split('/')[1]) || [];

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
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retries) * 1000 + Math.random() * 1000)
        );
        retries++;
      } else {
        throw error;
      }
    }
  }
}

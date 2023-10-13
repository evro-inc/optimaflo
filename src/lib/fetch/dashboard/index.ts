//API HELPERS
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/src/lib/prisma';
import { getServerSession } from 'next-auth/next';
import logger from '../../logger';

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
export async function grantGtmAccess(customerId: string) {
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

  // Get the product IDs for the GTM products
  const gtmProductIds = ['prod_OoCMHi502SCeOH', 'prod_OaGCBK8Qe6Vofp'];

  // Iterate over the product IDs
  for (const productId of gtmProductIds) {
    // Update the ProductAccess record for this user and product to grant access
    await prisma.productAccess.upsert({
      where: { userId_productId: { userId, productId } },
      update: { granted: true },
      create: { userId, productId, granted: true },
    });
  }
}

export async function fetchGtmSettings(userId) {
  // Fetch the user from your database using the Stripe customer ID
  const user = await prisma.account.findFirst({
    where: {
      userId: userId,
    },
  });

  const { access_token: accessToken, refresh_token: refreshToken } = user;

  // Create an OAuth2 client
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // This will refresh the access token if it's expired
  const { token } = await oauth2Client.getAccessToken();

  // Update the access token in your database
  await prisma.account.update({
    where: {
      userId: user.userId,
      id: user.id,
    },
    data: {
      access_token: token,
    },
  });

  // Check if the User record exists
  const existingUser = await prisma.User.findFirst({
    where: {
      id: user.userId,
    },
  });

  if (!existingUser) {
    console.log('user ID', user.id);

    // Create the User record if it doesn't exist
    await prisma.User.create({
      data: {
        id: user.userId,
      },
    });
  }

  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    //try catch block
    try {
      // Create a Tag Manager service client
      const gtm = new tagmanager_v2.Tagmanager({
        auth: oauth2Client,
      });

      // Fetch the list of accounts
      const accountsRes = await gtm.accounts.list();
      const accountIds =
        accountsRes.data.account?.map((account) => account.accountId) || [];

      for (const accountId of accountIds) {
        const containersRes = await gtm.accounts.containers.list({
          parent: `accounts/${accountId}`,
        });
        const containerIds =
          containersRes.data.container?.map(
            (container) => container.containerId
          ) || [];

        for (const containerId of containerIds) {
          const workspacesRes = await gtm.accounts.containers.workspaces.list({
            parent: `accounts/${accountId}/containers/${containerId}`,
          });
          const workspaceIds =
            workspacesRes.data.workspace?.map(
              (workspace) => workspace.workspaceId
            ) || [];

          // Store the account, container, and workspace IDs in the database
          for (const workspaceId of workspaceIds) {
            // Check if the record already exists
            const existingRecord = await prisma.gtm.findFirst({
              where: {
                userId: userId,
                accountId: accountId,
                containerId: containerId,
                workspaceId: workspaceId,
              },
            });

            // If the record does not exist, insert it
            if (!existingRecord) {
              await prisma.gtm.create({
                data: {
                  accountId: accountId,
                  containerId: containerId,
                  workspaceId: workspaceId,
                  User: {
                    connect: {
                      id: userId,
                    },
                  },
                },
              });
            }
          }
        }
      }
    } catch (error: any) {
      if (error.message.includes('Quota exceeded')) {
        // Wait for 2^retries * 1000 milliseconds and then retry
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retries) * 1000)
        );
        retries++;
      } else {
        throw error;
      }
    }
  }
} /* GA UTILS */

export async function grantGAAccess(customerId: string) {
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

  // Get the product IDs for the GTM products
  const GAProductIds = ['prod_OQ3TPC9yMxJAeN'];

  // Iterate over the product IDs
  for (const productId of GAProductIds) {
    // Update the ProductAccess record for this user and product to grant access
    await prisma.productAccess.upsert({
      where: { userId_productId: { userId, productId } },
      update: { granted: true },
      create: { userId, productId, granted: true },
    });
  }
}

/* NEEDS TO BE REFACTORED FOR GA4 */
export async function fetchGASettings(userId) {
  console.log('fetchGASettings userId', userId);

  // Fetch the user from your database using the Stripe customer ID
  const user = await prisma.account.findFirst({
    where: {
      userId: userId,
    },
  });

  // Create an OAuth2 client
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  // This will refresh the access token if it's expired
  const { token } = await oauth2Client.getAccessToken();

  // Update the access token in your database
  await prisma.account.update({
    where: {
      id: user.userId,
    },
    data: {
      access_token: token,
    },
  });

  // Check if the User record exists
  const existingUser = await prisma.User.findFirst({
    where: {
      id: user.id,
    },
  });

  if (!existingUser) {
    // Create the User record if it doesn't exist
    await prisma.User.create({
      data: {
        id: user.id,
      },
    });
  }

  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    //try catch block
    try {
      // Create a Tag Manager service client
      const gtm = new tagmanager_v2.Tagmanager({
        auth: oauth2Client,
      });

      // Fetch the list of accounts
      const accountsRes = await gtm.accounts.list();
      const accountIds =
        accountsRes.data.account?.map((account) => account.accountId) || [];

      for (const accountId of accountIds) {
        const containersRes = await gtm.accounts.containers.list({
          parent: `accounts/${accountId}`,
        });
        const containerIds =
          containersRes.data.container?.map(
            (container) => container.containerId
          ) || [];

        for (const containerId of containerIds) {
          const workspacesRes = await gtm.accounts.containers.workspaces.list({
            parent: `accounts/${accountId}/containers/${containerId}`,
          });
          const workspaceIds =
            workspacesRes.data.workspace?.map(
              (workspace) => workspace.workspaceId
            ) || [];

          // Store the account, container, and workspace IDs in the database
          for (const workspaceId of workspaceIds) {
            // Check if the record already exists
            const existingRecord = await prisma.gtm.findFirst({
              where: {
                userId: userId,
                accountId: accountId,
                containerId: containerId,
                workspaceId: workspaceId,
              },
            });

            // If the record does not exist, insert it
            if (!existingRecord) {
              await prisma.gtm.create({
                data: {
                  accountId: accountId,
                  containerId: containerId,
                  workspaceId: workspaceId,
                  User: {
                    connect: {
                      id: userId,
                    },
                  },
                },
              });
            }
          }
        }
      }
    } catch (error: any) {
      if (error.message.includes('Quota exceeded')) {
        // Wait for 2^retries * 1000 milliseconds and then retry
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retries) * 1000)
        );
        retries++;
      } else {
        throw error;
      }
    }
  }
}

export async function getSessionUserId(authOptions) {
  let session;
  let userId;
  try {
    session = await getServerSession(authOptions);
    userId = session?.user?.id;
  } catch (error) {
    logger.error('Error getting session from request', error);
    // handle the error appropriately
    throw error; // or return null, depending on how you want to handle the error
  }
  return userId;
}

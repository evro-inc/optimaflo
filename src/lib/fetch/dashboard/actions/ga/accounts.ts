'use server'; // Indicates that this file should only be used in a server environment

// Importing necessary modules and functions
import { auth } from '@clerk/nextjs'; // Importing authentication function from Clerk
import { limiter } from '../../../../bottleneck'; // Importing rate limiter configuration
import { gaRateLimit } from '../../../../redis/rateLimits'; // Importing rate limiting utility for Google Tag Manager
import { UpdateAccountSchema } from '../../../../schemas/ga/accounts'; // Importing schema for account updates
import { z } from 'zod'; // Importing Zod for schema validation
import { revalidatePath } from 'next/cache'; // Importing function to revalidate cached paths in Next.js
import { currentUserOauthAccessToken } from '@/src/lib/clerk'; // Importing function to get the current user's OAuth access token
import { redis } from '@/src/lib/redis/cache'; // Importing Redis cache instance
import { notFound } from 'next/navigation'; // Importing utility for handling 'not found' navigation in Next.js
import { handleApiResponseError, tierDeleteLimit, tierUpdateLimit } from '@/src/lib/helpers/server';
import { FeatureResponse } from '@/src/lib/types/types';
import prisma from '@/src/lib/prisma';

// Defining a type for form update schema using Zod
type FormUpdateSchema = z.infer<typeof UpdateAccountSchema>;

/************************************************************************************
 * List All Google Tag Manager Accounts
 ************************************************************************************/
export async function listGaAccounts() {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } : { userId: string | null } = auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `ga:accounts:userId:${userId}`;

  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  // Loop for retry mechanism
  while (retries < MAX_RETRIES) {
    try {
      // Enforcing rate limit for the user
      const { remaining } = await gaRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        let data;
        // Scheduling the API call with a rate limiter
        await limiter.schedule(async () => {
          // Setting up the API call
          const url = `https://analyticsadmin.googleapis.com/v1beta/accounts?fields=accounts(name,displayName,regionCode)`;
          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Making the API call
          const response = await fetch(url, { headers });

          // Handling non-OK responses by throwing an error
          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}. ${response.statusText}`
            );
          }
          // Parsing the response body
          const responseBody = await response.json();
          data = responseBody.accounts;
        });

        // Caching the data in Redis with a 2 hour expiration time
        redis.set(cacheKey, JSON.stringify(data), 'EX', 60 * 60 * 2);
        return data;
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      // Handling rate limit exceeded error
      if (error.code === 429 || error.status === 429) {
        // Adding jitter to avoid simultaneous retries
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        // Increasing the delay for the next retry
        delay *= 2;
        retries++;
      } else {
        // Throwing other types of errors
        throw error;
      }
    }
  }
  // Throwing an error if maximum retries are reached
  throw new Error('Maximum retries reached without a successful response.');
}

/************************************************************************************
 * Update Google Tag Manager Accounts
 ************************************************************************************/
export async function updateAccounts(
  selectedAccounts: Set<string>,
  accountNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulUpdates: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: string[] = [];
  const toUpdateAccounts = new Set(selectedAccounts);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4Accounts');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for updating accounts',
      results: [],
    };
  }

  if (toUpdateAccounts.size > availableUpdateUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot update ${toUpdateAccounts.size} accounts as it exceeds the available limit. You have ${availableUpdateUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot update ${toUpdateAccounts.size} accounts as it exceeds the available limit. You have ${availableUpdateUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toUpdateAccounts.size <= availableUpdateUsage) {
    // Retry loop for deletion requests
    while (
      retries < MAX_RETRIES &&
      toUpdateAccounts.size > 0 &&
      !permissionDenied
    ) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each account deletion
            const updatePromises = Array.from(toUpdateAccounts).map(
              async (combinedId) => {                
                const [name] = combinedId.split('-');

                const url = `https://analyticsadmin.googleapis.com/v1beta/${name}?updateMask=displayName`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const response = await fetch(url, {
                    method: 'DELETE',
                    headers: headers,
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulUpdates.push(name);
                    toUpdateAccounts.delete(name);

                   /*  await prisma.ga.updateMany({
                      where: {
                        accountId: accountId,
                        accountId: accountId,
                        userId: userId, // Ensure this matches the user ID
                      },
                    }); */

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { updateUsage: { increment: 1 } },
                    });

                    return { name, success: true };
                  } else {
                    parsedResponse = await response.json();
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'ga4Account',
                      accountNames
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(name);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push(name); // Track 404 errors
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for account ${accountNames}.`
                      );
                    }

                    toUpdateAccounts.delete(name);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                } catch (error: any) {
                  // Handling exceptions during fetch
                  errors.push(
                    `Error deleting account ${name}: ${error.message}`
                  );
                }
                toUpdateAccounts.delete(name);
                return { name, success: false };
              }
            );

            // Awaiting all deletion promises
            await Promise.all(updatePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not update account. Please check your permissions. Account Name: 
              ${accountNames.find((name) =>
                name.includes(name)
              )}. All other accounts were successfully updated.`,
              results: notFoundLimit.map((name) => ({
                id: [name], // Ensure id is an array
                name: [
                  accountNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                notFound: true,
              })),
            };
          }
          if (featureLimitReached.length > 0) {
            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for accounts: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((name) => ({
                id: [name], // Ensure id is an array
                name: [
                  accountNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulUpdates.length === selectedAccounts.size) {
            break; // Exit loop if all accounts are processed successfully
          }
          if (permissionDenied) {
            break; // Exit the loop if a permission error was encountered
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        // Handling rate limit exceeded error
        if (error.code === 429 || error.status === 429) {
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (userId) {
          // Invalidate cache for all accounts if accounts belong to multiple accounts
          // Otherwise, just invalidate cache for the single account
          const cacheKey = `ga:accounts:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/ga/accounts`);
        }
      }
    }
  }
  if (permissionDenied) {
    return {
      success: false,
      errors: errors,
      results: [],
      message: errors.join(', '),
    };
  }

  if (errors.length > 0) {
    return {
      success: false,
      features: successfulUpdates,
      errors: errors,
      results: successfulUpdates.map((name) => ({
        id: [name], // Ensure id is an array
        name: [accountNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the updateUsage
  if (successfulUpdates.length > 0) {
    const cacheKey = `ga:accounts:userId:${userId}`;

    // Update the Redis cache
    await redis.del(cacheKey);
    // Revalidate paths if needed
    revalidatePath(`/dashboard/ga/accounts`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully updated ${successfulUpdates.length} account(s)`,
    features: successfulUpdates,
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map((accountId) => ({
      id: [accountId], // Ensure id is an array
      name: [accountNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}




/************************************************************************************
  Delete a single or multiple accounts
************************************************************************************/
export async function deleteAccounts(
  selectedAccounts: Set<string>,
  accountNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: string[] = [];
  const toDeleteAccounts = new Set(selectedAccounts);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4Accounts');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Accounts',
      results: [],
    };
  }

  if (toDeleteAccounts.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteAccounts.size} accounts as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteAccounts.size} accounts as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteAccounts.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (
      retries < MAX_RETRIES &&
      toDeleteAccounts.size > 0 &&
      !permissionDenied
    ) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each account deletion
            const deletePromises = Array.from(toDeleteAccounts).map(
              async (combinedId) => {                
                const [name] = combinedId.split('-');

                const url = `https://analyticsadmin.googleapis.com/v1beta/${name}`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const response = await fetch(url, {
                    method: 'DELETE',
                    headers: headers,
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulDeletions.push(name);
                    toDeleteAccounts.delete(name);

                   /*  await prisma.ga.deleteMany({
                      where: {
                        accountId: accountId,
                        accountId: accountId,
                        userId: userId, // Ensure this matches the user ID
                      },
                    }); */

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { deleteUsage: { increment: 1 } },
                    });

                    return { name, success: true };
                  } else {
                    parsedResponse = await response.json();
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'gaAccount',
                      accountNames
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(name);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push(name); // Track 404 errors
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for account ${accountNames}.`
                      );
                    }

                    toDeleteAccounts.delete(name);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                } catch (error: any) {
                  // Handling exceptions during fetch
                  errors.push(
                    `Error deleting account ${name}: ${error.message}`
                  );
                }
                toDeleteAccounts.delete(name);
                return { name, success: false };
              }
            );

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete account. Please check your permissions. Account Name: 
              ${accountNames.find((name) =>
                name.includes(name)
              )}. All other accounts were successfully deleted.`,
              results: notFoundLimit.map((accountId) => ({
                id: [accountId], // Ensure id is an array
                name: [
                  accountNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                notFound: true,
              })),
            };
          }
          if (featureLimitReached.length > 0) {
            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for accounts: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((accountId) => ({
                id: [accountId], // Ensure id is an array
                name: [
                  accountNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedAccounts.size) {
            break; // Exit loop if all accounts are processed successfully
          }
          if (permissionDenied) {
            break; // Exit the loop if a permission error was encountered
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        // Handling rate limit exceeded error
        if (error.code === 429 || error.status === 429) {
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (userId) {
          // Invalidate cache for all accounts if accounts belong to multiple accounts
          // Otherwise, just invalidate cache for the single account
          const cacheKey = `ga:accounts:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/ga/accounts`);
        }
      }
    }
  }
  if (permissionDenied) {
    return {
      success: false,
      errors: errors,
      results: [],
      message: errors.join(', '),
    };
  }

  if (errors.length > 0) {
    return {
      success: false,
      features: successfulDeletions,
      errors: errors,
      results: successfulDeletions.map((accountId) => ({
        id: [accountId], // Ensure id is an array
        name: [accountNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    const cacheKey = `ga:accounts:userId:${userId}`;

    // Update the Redis cache
    await redis.del(cacheKey);
    // Revalidate paths if needed
    revalidatePath(`/dashboard/ga/accounts`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} account(s)`,
    features: successfulDeletions,
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map((accountId) => ({
      id: [accountId], // Ensure id is an array
      name: [accountNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}
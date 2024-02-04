'use server'; // Indicates that this file should only be used in a server environment

// Importing necessary modules and functions
import { auth } from '@clerk/nextjs'; // Importing authentication function from Clerk
import { limiter } from '../../../../bottleneck'; // Importing rate limiter configuration
import { gaRateLimit } from '../../../../redis/rateLimits'; // Importing rate limiting utility for Google Tag Manager
import {
  UpdateAccountSchema,
  CreateAccountSchema,
} from '../../../../schemas/ga/accounts'; // Importing schema for account updates
import { z } from 'zod'; // Importing Zod for schema validation
import { revalidatePath } from 'next/cache'; // Importing function to revalidate cached paths in Next.js
import { currentUserOauthAccessToken } from '@/src/lib/clerk'; // Importing function to get the current user's OAuth access token
import { redis } from '@/src/lib/redis/cache'; // Importing Redis cache instance
import { notFound } from 'next/navigation'; // Importing utility for handling 'not found' navigation in Next.js
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';
import { FeatureResponse, FeatureResult } from '@/src/lib/types/types';
import prisma from '@/src/lib/prisma';
import { fetchGASettings, fetchGtmSettings } from '../..';

// Defining a type for form update schema using Zod
type FormUpdateSchema = z.infer<typeof UpdateAccountSchema>;
type FormCreateSchema = z.infer<typeof CreateAccountSchema>;

/************************************************************************************
 * List All Google Tag Manager Accounts
 ************************************************************************************/
export async function listGaAccounts() {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId }: { userId: string | null } = auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token: any = await currentUserOauthAccessToken(userId);

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
export async function UpdateGaAccounts(formData: FormUpdateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulUpdates: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toUpdateAccounts = new Set(
    formData.forms.map((acct) => ({
      displayName: acct.displayName,
      name: acct.name,
    }))
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4Accounts');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    accountName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating Accounts',
      results: [],
    };
  }

  if (toUpdateAccounts.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateAccounts).map((identifier) => {
      const { displayName: accountName } = identifier;
      return {
        id: [], // No account ID since update did not happen
        name: accountName, // Include the account name from the identifier
        success: false,
        message: `Update limit reached. Cannot update account "${accountName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateAccounts.size} accounts as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateAccounts.size} accounts as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const accountNames = formData.forms.map((acct) => acct.displayName);

  if (toUpdateAccounts.size <= availableUpdateUsage) {
    while (
      retries < MAX_RETRIES &&
      toUpdateAccounts.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateAccounts).map(
              async (identifier) => {
                accountIdForCache = identifier.displayName;
                const accountIdentifier = identifier.name;
                const accountData = formData.forms.find(
                  (acct) => acct.displayName === identifier.displayName
                );

                if (!accountData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toUpdateAccounts.delete(identifier);
                  return;
                }

                const url = `https://analyticsadmin.googleapis.com/v1beta/${accountIdentifier}?updateMask=displayName`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [accountData] };

                  const validationResult =
                    UpdateAccountSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toUpdateAccounts.delete(identifier);
                    return {
                      accountData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated account data
                  const validatedaccountData = validationResult.data.forms[0];
                  const payload = JSON.stringify({
                    displayName: validatedaccountData.displayName,
                  });

                  const response = await fetch(url, {
                    method: 'PATCH',
                    headers: headers,
                    body: payload,
                  });

                  let parsedResponse;
                  const accountName = accountData.displayName;

                  if (response.ok) {
                    if (response.ok) {
                      // Push a string into the array, for example, a concatenation of accountId and containerId
                      successfulUpdates.push(
                        `${validatedaccountData.displayName}`
                      );
                      // ... rest of your code
                    }
                    toUpdateAccounts.delete(identifier);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { updateUsage: { increment: 1 } },
                    });

                    UpdateResults.push({
                      accountName: accountName,
                      success: true,
                      message: `Successfully updated account ${accountName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'account',
                      [accountName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(accountName);
                      } else if (errorResult.errorCode === 404) {
                        const accountName =
                          accountNames.find((name) =>
                            name.includes(identifier.name)
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.displayName,
                          name: accountName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for account ${accountName}.`
                      );
                    }

                    toUpdateAccounts.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    UpdateResults.push({
                      accountName: accountName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception updating account ${accountData.displayName}: ${error.message}`
                  );
                  toUpdateAccounts.delete(identifier);
                  UpdateResults.push({
                    accountName: accountData.displayName,
                    success: false,
                    message: error.message,
                  });
                }
              }
            );

            await Promise.all(updatePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              features: [],

              results: notFoundLimit.map((item) => ({
                id: item.id,
                name: item.name,
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
              results: featureLimitReached.map((accountId) => {
                // Find the name associated with the accountId
                const accountName =
                  accountNames.find((name) => name.includes(accountId)) ||
                  'Unknown';
                return {
                  id: [accountId], // Ensure id is an array
                  name: [accountName], // Ensure name is an array, match by accountId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
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
              results: featureLimitReached.map((accountId) => {
                // Find the name associated with the accountId
                const accountName =
                  accountNames.find((name) => name.includes(accountId)) ||
                  'Unknown';
                return {
                  id: [accountId], // Ensure id is an array
                  name: [accountName], // Ensure name is an array, match by accountId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateAccounts.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay + Math.random() * 200)
          );
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (accountIdForCache && containerIdForCache && userId) {
          const cacheKey = `ga:accounts:userId:${userId}`;
          await redis.del(cacheKey);
          revalidatePath(`/dashboard/ga/accounts`);
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
      results: successfulUpdates.map((accountName) => ({
        accountName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0) {
    const cacheKey = `ga:accounts:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/accounts`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.accountId is defined before adding it to the array
    const accountId = form.displayName ? [form.displayName] : []; // Provide an empty array as a fallback
    return {
      id: accountId, // Ensure id is an array of strings
      name: [form.displayName], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual account IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Accounts updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
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
                  accountNames.find((name) => name.includes(name)) || 'Unknown',
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
                  accountNames.find((name) => name.includes(name)) || 'Unknown',
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

/************************************************************************************
  Create a single account or multiple accounts
************************************************************************************/
export async function createAccounts(formData: FormCreateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  // Refactor: Use string identifiers in the set
  const toCreateAccounts = new Set(
    formData.forms.map((acct) => `${acct.displayName}`)
  );

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4Accounts');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    accountName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Accounts',
      results: [],
    };
  }

  if (toCreateAccounts.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateAccounts).map(
      (identifier) => {
        const [displayName] = identifier.split('-');
        return {
          id: [], // No account ID since creation did not happen
          name: displayName, // Include the account name from the identifier
          success: false,
          message: `Creation limit reached. Cannot create account "${displayName}".`,
          // remaining creation limit
          remaining: availableCreateUsage,
          limitReached: true,
        };
      }
    );
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateAccounts.size} accounts as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateAccounts.size} accounts as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  let accountTicketIds = [] as string[];
  const accountNames = formData.forms.map((acct) => acct.displayName);

  if (toCreateAccounts.size <= availableCreateUsage) {
    while (
      retries < MAX_RETRIES &&
      toCreateAccounts.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateAccounts).map(
              async (identifier: any) => {
                const [displayName] = identifier.split('-');
                const accountData = formData.forms.find(
                  (acct) => acct.displayName === displayName
                );

                if (!accountData) {
                  errors.push(`Account data not found for ${identifier}`);
                  toCreateAccounts.delete(identifier);
                  return;
                }

                const url = `https://analyticsadmin.googleapis.com/v1beta/accounts:provisionAccountTicket`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [accountData] };

                  const validationResult =
                    CreateAccountSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toCreateAccounts.delete(identifier);
                    return {
                      accountData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated account data
                  const validatedAccountData = validationResult.data.forms[0];
                  const requestBody = {
                    account: {
                      displayName: validatedAccountData.displayName,
                      regionCode: 'US',
                    }, // Populate with the account details
                    redirectUri:
                      'https://www.optimaflo.io/dashboard/ga/accounts', // Provide the redirectUri for ToS acceptance
                  };

                  const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                  });

                  let parsedResponse;

                  if (response.ok) {
                    const ticket = await response.json();
                    accountTicketIds.push(ticket.accountTicketId);

                    successfulCreations.push(accountData.displayName);
                    toCreateAccounts.delete(identifier);
                    fetchGtmSettings(userId);
                    fetchGASettings(userId);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } },
                    });
                    creationResults.push({
                      accountName: accountData.displayName,
                      success: true,
                      message: `Successfully created account ${accountData.displayName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'GA4Account',
                      [accountData.displayName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(displayName);
                      } else if (errorResult.errorCode === 404) {
                        const accountName =
                          accountNames.find((name) =>
                            name.includes(identifier.split('-')[1])
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.split('-')[1],
                          name: accountName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for account ${accountData.displayName}.`
                      );
                    }

                    toCreateAccounts.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      accountName: accountData.displayName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating account ${accountData.displayName}: ${error.message}`
                  );
                  toCreateAccounts.delete(identifier);
                  creationResults.push({
                    accountName: accountData.displayName,
                    success: false,
                    message: error.message,
                  });
                }
              }
            );

            await Promise.all(createPromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              features: [],

              results: notFoundLimit.map((item) => ({
                id: item.id,
                name: item.name,
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
              results: featureLimitReached.map((accountId) => {
                // Find the name associated with the accountId
                const accountName =
                  accountNames.find((name) => name.includes(accountId)) ||
                  'Unknown';
                return {
                  id: [accountId], // Ensure id is an array
                  name: [accountName], // Ensure name is an array, match by accountId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateAccounts.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay + Math.random() * 200)
          );
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (userId) {
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
      features: successfulCreations,
      errors: errors,
      results: successfulCreations.map((accountTicketIds) => ({
        accountTicketIds,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:accounts:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/accounts`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form, index) => {
    // Ensure that form.accountId is defined before adding it to the array
    const accountTicketId = accountTicketIds[index];

    return {
      id: accountTicketId, // Ensure id is an array of strings
      name: [form.displayName], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  const finalResults = {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual account IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Accounts created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
  // Return the response with the correctly typed results
  return finalResults;
}

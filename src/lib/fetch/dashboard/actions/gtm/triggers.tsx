'use server';
import { revalidatePath } from 'next/cache';
import { FormsSchema } from '@/src/lib/schemas/gtm/triggers';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { Trigger, FeatureResponse, FeatureResult, Trigger } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';

// Define the types for the form data
type schema = z.infer<typeof FormsSchema>;

/************************************************************************************
  Function to list or get one GTM triggers
************************************************************************************/
export async function listTriggers(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 20;
  let delay = 2000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:triggers:userId:${userId}`;
  if (skipCache == false) {
    const cachedValue = await redis.get(cacheKey);
    if (cachedValue) {
      return JSON.parse(cachedValue);
    }
  }
  await fetchGtmSettings(userId);

  const gtmData = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      gtm: true,
    },
  });

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniquePairs = new Set(
            gtmData.gtm.map((data) => ({
              accountId: data.accountId,
              containerId: data.containerId,
              workspaceId: data.workspaceId,
            }))
          );

          const urls = Array.from(uniquePairs).map((props: any) => {
            const { accountId, containerId, workspaceId } = props;
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;
          });

          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          for (const url of urls) {
            try {
              const response = await fetch(url, { headers });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
              }
              const responseBody = await response.json();

              allData.push(responseBody.trigger || []);
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

        redis.set(cacheKey, JSON.stringify(allData.flat()));

        return allData;
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Maximum retries reached without a successful response.');
}

/************************************************************************************
  Delete a single or multiple triggers
************************************************************************************/
export async function DeleteTriggers(ga4TriggerToDelete: Trigger[]): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track triggerious outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{
    combinedId: string;
    name: string;
  }> = [];
  const featureLimitReached: {
    combinedId: string;
    name: string;
  }[] = [];
  const notFoundLimit: Array<{
    combinedId: string;
    name: string;
  }> = [];

  const toDeleteTriggers = new Set(
    ga4TriggerToDelete.map(
      (prop) => `${prop.accountId}-${prop.containerId}-${prop.workspaceId}-${prop.type}`
    )
  );
  let accountIdForCache: string | undefined;

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMTriggers');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;
  const triggerIdsProcessed = new Set<string>();

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Triggers',
      results: [],
    };
  }

  if (toDeleteTriggers.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteTriggers.size} triggers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteTriggers.size} triggers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteTriggers.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteTriggers.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(ga4TriggerToDelete).map(async (prop) => {
              const { accountId, containerId, workspaceId, triggerId, type } = prop;
              accountIdForCache = accountId;

              let url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`;

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

                const parsedResponse = await response.json();

                if (response.ok) {
                  triggerIdsProcessed.add(containerId);
                  successfulDeletions.push({
                    combinedId: `${accountId}-${containerId}-${workspaceId}-${triggerId}`,
                    name: type,
                  });

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  toDeleteTriggers.delete(
                    `${accountId}-${containerId}-${workspaceId}-${triggerId}-${type}`
                  );
                  fetchGtmSettings(userId);

                  return {
                    combinedId: `${accountId}-${containerId}-${workspaceId}-${triggerId}-${type}`,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'trigger',
                    [type]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}-${triggerId}`,
                        name: type,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}-${triggerId}`,
                        name: type,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for  trigger ${type}.`);
                  }

                  toDeleteTriggers.delete(
                    `${accountId}-${containerId}-${workspaceId}-${triggerId}`
                  );
                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(
                  `Error deleting  trigger ${accountId}-${containerId}-${workspaceId}-${triggerId}: ${error.message}`
                );
              }
              triggerIdsProcessed.add(containerId);
              toDeleteTriggers.delete(`${accountId}-${containerId}-${workspaceId}-${triggerId}`);
              return { containerId, success: false };
            });

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete trigger. Please check your permissions. Container Name: 
              ${notFoundLimit
                .map(({ name }) => name)
                .join(', ')}. All other triggers were successfully deleted.`,
              results: notFoundLimit.map(({ combinedId, name }) => {
                const [accountId, containerId, workspaceId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, workspaceId], // Ensure id is an array
                  name: [name], // Ensure name is an array, match by triggerId or default to 'Unknown'
                  success: false,
                  notFound: true,
                };
              }),
            };
          }
          if (featureLimitReached.length > 0) {
            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for triggers: ${featureLimitReached
                .map(({ combinedId }) => combinedId)
                .join(', ')}`,
              results: featureLimitReached.map(({ combinedId, name }) => {
                const [accountId, containerId, workspaceId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, workspaceId], // Ensure id is an array
                  name: [name], // Ensure name is an array, use the name from featureLimitReached
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === ga4TriggerToDelete.length) {
            break; // Exit loop if all containers are processed successfully
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
        const cacheKey = `gtm:triggers:userId:${userId}`;
        await redis.del(cacheKey);

        await revalidatePath(`/dashboard/gtm/configurations`);
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
      features: successfulDeletions.map(({ combinedId }) => combinedId),
      errors: errors,
      results: successfulDeletions.map(({ combinedId, name }) => {
        const [accountId, containerId, workspaceId] = combinedId.split('-');
        return {
          id: [accountId, containerId, workspaceId], // Ensure id is an array
          name: [name], // Ensure name is an array and provide a default value
          success: true,
        };
      }),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    const specificCacheKey = `gtm:triggers:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedTriggers = successfulDeletions.length;

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedTriggers} trigger(s)`,
    features: successfulDeletions.map(({ combinedId }) => combinedId),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ combinedId, name }) => {
      const [accountId, containerId, workspaceId] = combinedId.split('-');
      return {
        id: [accountId, containerId, workspaceId], // Ensure id is an array
        name: [name], // Ensure name is an array
        success: true,
      };
    }),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateTriggers(formData: Trigger) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];
  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toCreateTriggers = new Set(formData.forms.map((trigger) => trigger));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMTriggers');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    triggerName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Triggers',
      results: [],
    };
  }

  // refactor and verify
  if (toCreateTriggers.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateTriggers).map((identifier: any) => {
      const { name: triggerName, filter } = identifier;

      return {
        id: [], // No trigger ID since creation did not happen
        name: triggerName, // Include the trigger name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create trigger "${triggerName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateTriggers.size} triggers as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateTriggers.size} triggers as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const triggerNames = formData.forms.map((cd) => cd.type);

  if (toCreateTriggers.size <= availableCreateUsage) {
    // Initialize retries trigger to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toCreateTriggers.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateTriggers).map(async (identifier: any) => {
              if (!identifier) {
                errors.push(`Trigger data not found for ${identifier}`);
                toCreateTriggers.delete(identifier);
                return;
              }

              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${identifier.accountId}/containers/${identifier.containerId}/workspaces/${identifier.workspaceId}/triggers`;

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [identifier] };

                const validationResult = FormsSchema.safeParse(formDataToValidate);

                console.log('formDataToValidate', JSON.stringify(formDataToValidate, null, 2));

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toCreateTriggers.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                const validatedData = validationResult.data.forms[0];

                const response = await fetch(url.toString(), {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(validatedData),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } }, // Increment by the number of created triggers
                  });

                  successfulCreations.push(
                    `${validatedData.accountId}-${validatedData.containerId}-${validatedData.workspaceId}`
                  ); // Update with a proper identifier
                  toCreateTriggers.delete(identifier);
                  fetchGtmSettings(userId);

                  creationResults.push({
                    success: true,
                    message: `Successfully created trigger ${validatedData}`,
                    triggerName: '',
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'trigger',
                    [JSON.stringify(validatedData)]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(identifier);
                    } else if (errorResult.errorCode === 404) {
                      const triggerName =
                        triggerNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: Array.isArray(triggerName) ? triggerName.join(', ') : triggerName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for trigger.`);
                  }

                  toCreateTriggers.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    triggerName: identifier.name,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating trigger: ${error.message}`);
                toCreateTriggers.delete(identifier);
                creationResults.push({
                  triggerName: identifier.name,
                  success: false,
                  message: error.message,
                });
              }
            });

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
              message: `Feature limit reached for triggers: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((triggerId) => {
                // Find the name associated with the triggerId
                return {
                  id: [triggerId], // Ensure id is an array
                  name: [triggerNames], // Ensure name is an array, match by triggerId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateTriggers.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 200));
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (accountIdForCache && containerIdForCache && userId) {
          const cacheKey = `gtm:triggers:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/configurations`);
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
      results: successfulCreations.map((triggerName) => ({
        triggerName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:triggers:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.flatMap(
    (form) =>
      form.gtmEntity?.map((entity) => ({
        id: [`${entity.accountId}-${entity.containerId}-${entity.workspaceId}`], // Wrap the unique identifier in an array
        name: [form.triggers.name], // Ensure name is an array with a single string
        success: true, // or false, depending on the actual result
        notFound: false, // Set this to the appropriate value based on your logic
      })) || []
  );

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual trigger IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}
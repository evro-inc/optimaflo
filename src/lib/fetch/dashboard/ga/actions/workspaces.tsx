'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/lib/schemas/gtm/workspaces';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/lib/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';
import { fetchGtmSettings } from '../..';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateWorkspaceSchema>;
type FormUpdateSchema = z.infer<typeof UpdateWorkspaceSchema>;

/************************************************************************************
  Function to list or get one GTM workspaces
************************************************************************************/
export async function listGtmWorkspaces() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;
  let responseBody: any;

  const gtmData = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      gtm: true,
    },
  });

  const cacheKey = `gtm:workspaces:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniquePairs = new Set(
            gtmData.gtm.map((data) => `${data.accountId}-${data.containerId}`)
          );

          const urls = Array.from(uniquePairs).map((pair: any) => {
            const [accountId, containerId] = pair.split('-');
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces?fields=workspace(accountId,containerId,name,workspaceId)`;
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
                throw new Error(
                  `HTTP error! status: ${response.status}. ${response.statusText}`
                );
              }
              responseBody = await response.json();
              allData.push(responseBody.workspace || []);
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
  Delete a single or multiple workspaces
************************************************************************************/
export async function DeleteWorkspaces(
  selectedWorkspaces: Set<string>,
  workspaceNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{
    containerId: string;
    workspaceId: string;
  }> = [];
  const featureLimitReached: { containerId: string; workspaceId: string }[] =
    [];
  const notFoundLimit: { containerId: string; workspaceId: string }[] = [];
  const toDeleteWorkspaces = new Set<string>(selectedWorkspaces);
  let accountIdForCache: string | undefined;

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMWorkspaces');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;
  const containerIdsProcessed = new Set<string>();

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Workspaces',
      results: [],
    };
  }

  if (toDeleteWorkspaces.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteWorkspaces.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (
      retries < MAX_RETRIES &&
      toDeleteWorkspaces.size > 0 &&
      !permissionDenied
    ) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(toDeleteWorkspaces).map(
              async (combinedId) => {
                const [accountId, containerId, workspaceId] =
                  combinedId.split('-');
                accountIdForCache = accountId;

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
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
                    containerIdsProcessed.add(containerId);
                    successfulDeletions.push({ containerId, workspaceId });
                    toDeleteWorkspaces.delete(combinedId);
                    await prisma.gtm.deleteMany({
                      where: {
                        accountId: accountId,
                        containerId: containerId,
                        workspaceId: workspaceId,
                        userId: userId, // Ensure this matches the user ID
                      },
                    });
                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { deleteUsage: { increment: 1 } },
                    });

                    return {
                      containerId,
                      workspaceId,
                      success: true,
                    };
                  } else {
                    parsedResponse = await response.json();
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'workspace',
                      workspaceNames
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push({ containerId, workspaceId });
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push({ containerId, workspaceId }); // Track 404 errors
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for container ${workspaceNames}.`
                      );
                    }

                    toDeleteWorkspaces.delete(
                      `${accountId}-${containerId}-${workspaceId}`
                    );
                    permissionDenied = errorResult ? true : permissionDenied;

                    if (selectedWorkspaces.size > 0) {
                      const firstWorkspaceId = selectedWorkspaces
                        .values()
                        .next().value;
                      accountIdForCache = firstWorkspaceId.split('-')[0];
                    }
                  }
                } catch (error: any) {
                  // Handling exceptions during fetch
                  errors.push(
                    `Error deleting container ${containerId}: ${error.message}`
                  );
                }
                containerIdsProcessed.add(containerId);
                toDeleteWorkspaces.delete(
                  `${accountId}-${containerId}-${workspaceId}`
                );
                return { containerId, success: false };
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
              message: `Could not delete container. Please check your permissions. Container Name: 
              ${workspaceNames.find((name) =>
                name.includes(name)
              )}. All other containers were successfully deleted.`,
              results: notFoundLimit.map(({ containerId, workspaceId }) => ({
                id: [containerId, workspaceId], // Combine containerId and workspaceId into a single array of strings
                name: [
                  workspaceNames.find((name) => name.includes(workspaceId)) ||
                    'Unknown',
                ], // Ensure name is an array, match by workspaceId or default to 'Unknown'
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
              message: `Feature limit reached for containers: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map(
                ({ containerId, workspaceId }) => ({
                  id: [containerId, workspaceId], // Ensure id is an array
                  name: [
                    workspaceNames.find((name) => name.includes(name)) ||
                      'Unknown',
                  ], // Ensure name is an array, match by containerId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                })
              ),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedWorkspaces.size) {
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
        // This block will run regardless of the outcome of the try...catch

        const cacheKey = `gtm:workspaces:userId:${userId}`;
        await redis.del(cacheKey);

        await revalidatePath(`/dashboard/gtm/workspaces`);
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
      features: successfulDeletions.map(
        ({ containerId, workspaceId }) => `${containerId}-${workspaceId}`
      ),
      errors: errors,
      results: successfulDeletions.map(({ containerId, workspaceId }) => ({
        id: [containerId, workspaceId], // Ensure id is an array
        name: [workspaceNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    for (const { containerId } of successfulDeletions) {
      const specificCacheKey = `gtm:workspaces:accountId:${accountIdForCache}:containerId:${containerId}:userId:${userId}`;
      await redis.del(specificCacheKey);
    }
    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} container(s)`,
    features: successfulDeletions.map(
      ({ containerId, workspaceId }) => `${containerId}-${workspaceId}`
    ),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ containerId, workspaceId }) => ({
      id: [containerId, workspaceId], // Ensure id is an array
      name: [workspaceNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateWorkspaces(formData: FormCreateSchema) {
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
  const toCreateWorkspaces = new Set(
    formData.forms.map((ws) => ({
      accountId: ws.accountId,
      containerId: ws.containerId,
      name: ws.name,
      description: ws.description,
    }))
  );

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMWorkspaces');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    workspaceName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Workspaces',
      results: [],
    };
  }

  // refactor and verify
  if (toCreateWorkspaces.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateWorkspaces).map(
      (identifier) => {
        const { name: workspaceName } = identifier;
        return {
          id: [], // No workspace ID since creation did not happen
          name: workspaceName, // Include the workspace name from the identifier
          success: false,
          message: `Creation limit reached. Cannot create workspace "${workspaceName}".`,
          // remaining creation limit
          remaining: availableCreateUsage,
          limitReached: true,
        };
      }
    );
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const workspaceNames = formData.forms.map((cd) => cd.name);

  if (toCreateWorkspaces.size <= availableCreateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (
      retries < MAX_RETRIES &&
      toCreateWorkspaces.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateWorkspaces).map(
              async (identifier) => {
                const { accountId, name: workspaceName } = identifier;
                accountIdForCache = accountId;
                containerIdForCache = identifier.containerId;
                const workspaceData = formData.forms.find(
                  (cd) =>
                    cd.accountId === accountId && cd.name === workspaceName
                );

                if (!workspaceData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toCreateWorkspaces.delete(identifier);
                  return;
                }

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [workspaceData] };

                  const validationResult =
                    CreateWorkspaceSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toCreateWorkspaces.delete(identifier);
                    return {
                      workspaceData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated workspace data
                  const validatedContainerData = validationResult.data.forms[0];

                  const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                      accountId: accountId,
                      name: workspaceName,
                      description: validatedContainerData.description,
                      containerId: validatedContainerData.containerId,
                    }),
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulCreations.push(workspaceName);
                    toCreateWorkspaces.delete(identifier);
                    fetchGtmSettings(userId);
                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } },
                    });
                    creationResults.push({
                      workspaceName: workspaceName,
                      success: true,
                      message: `Successfully created workspace ${workspaceName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'workspace',
                      [workspaceName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(workspaceName);
                      } else if (errorResult.errorCode === 404) {
                        const workspaceName =
                          workspaceNames.find((name) =>
                            name.includes(identifier.name)
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.containerId,
                          name: workspaceName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for workspace ${workspaceName}.`
                      );
                    }

                    toCreateWorkspaces.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      workspaceName: workspaceName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating workspace ${workspaceName}: ${error.message}`
                  );
                  toCreateWorkspaces.delete(identifier);
                  creationResults.push({
                    workspaceName: workspaceName,
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
              message: `Feature limit reached for workspaces: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((workspaceId) => {
                // Find the name associated with the workspaceId
                const workspaceName =
                  workspaceNames.find((name) => name.includes(workspaceId)) ||
                  'Unknown';
                return {
                  id: [workspaceId], // Ensure id is an array
                  name: [workspaceName], // Ensure name is an array, match by workspaceId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateWorkspaces.size === 0) {
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
          const cacheKey = `gtm:workspaces:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/workspaces`);
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
      results: successfulCreations.map((workspaceName) => ({
        workspaceName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (
    successfulCreations.length > 0 &&
    accountIdForCache &&
    containerIdForCache
  ) {
    const cacheKey = `gtm:workspaces:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.workspaceId is defined before adding it to the array
    const workspaceId = form.workspaceId ? [form.workspaceId] : []; // Provide an empty array as a fallback
    return {
      id: workspaceId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual workspace IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Udpate a single container or multiple containers
************************************************************************************/
export async function UpdateWorkspaces(formData: FormUpdateSchema) {
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
  const toUpdateWorkspaces = new Set(
    formData.forms.map((ws) => ({
      accountId: ws.accountId,
      containerId: ws.containerId,
      name: ws.name,
      description: ws.description,
      workspaceId: ws.workspaceId,
    }))
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMWorkspaces');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    workspaceName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating Workspaces',
      results: [],
    };
  }

  if (toUpdateWorkspaces.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateWorkspaces).map(
      (identifier) => {
        const { name: workspaceName } = identifier;
        return {
          id: [], // No workspace ID since update did not happen
          name: workspaceName, // Include the workspace name from the identifier
          success: false,
          message: `Update limit reached. Cannot update workspace "${workspaceName}".`,
          // remaining update limit
          remaining: availableUpdateUsage,
          limitReached: true,
        };
      }
    );
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateWorkspaces.size} workspaces as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const workspaceNames = formData.forms.map((cd) => cd.name);

  if (toUpdateWorkspaces.size <= availableUpdateUsage) {
    while (
      retries < MAX_RETRIES &&
      toUpdateWorkspaces.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateWorkspaces).map(
              async (identifier) => {
                accountIdForCache = identifier.accountId;
                containerIdForCache = identifier.containerId;
                const workspaceData = formData.forms.find(
                  (ws) =>
                    ws.accountId === identifier.accountId &&
                    ws.containerId === identifier.containerId &&
                    ws.name === identifier.name &&
                    ws.description === identifier.description
                );

                if (!workspaceData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toUpdateWorkspaces.delete(identifier);
                  return;
                }

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [workspaceData] };

                  const validationResult =
                    UpdateWorkspaceSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toUpdateWorkspaces.delete(identifier);
                    return {
                      workspaceData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated workspace data
                  const validatedworkspaceData = validationResult.data.forms[0];
                  const payload = JSON.stringify({
                    accountId: validatedworkspaceData.accountId,
                    name: validatedworkspaceData.name,
                    description: validatedworkspaceData.description,
                    containerId: validatedworkspaceData.containerId,
                    workspaceId: validatedworkspaceData.workspaceId,
                  });

                  const response = await fetch(url, {
                    method: 'PUT',
                    headers: headers,
                    body: payload,
                  });

                  let parsedResponse;
                  const workspaceName = workspaceData.name;

                  if (response.ok) {
                    if (response.ok) {
                      // Push a string into the array, for example, a concatenation of workspaceId and containerId
                      successfulUpdates.push(
                        `${validatedworkspaceData.workspaceId}-${validatedworkspaceData.containerId}`
                      );
                      // ... rest of your code
                    }
                    toUpdateWorkspaces.delete(identifier);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { updateUsage: { increment: 1 } },
                    });

                    UpdateResults.push({
                      workspaceName: workspaceName,
                      success: true,
                      message: `Successfully updated workspace ${workspaceName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'workspace',
                      [workspaceName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(workspaceName);
                      } else if (errorResult.errorCode === 404) {
                        const workspaceName =
                          workspaceNames.find((name) =>
                            name.includes(identifier.name)
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.containerId,
                          name: workspaceName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for workspace ${workspaceName}.`
                      );
                    }

                    toUpdateWorkspaces.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    UpdateResults.push({
                      workspaceName: workspaceName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception updating workspace ${workspaceData.workspaceId}: ${error.message}`
                  );
                  toUpdateWorkspaces.delete(identifier);
                  UpdateResults.push({
                    workspaceName: workspaceData.name,
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
              message: `Feature limit reached for workspaces: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((workspaceId) => {
                // Find the name associated with the workspaceId
                const workspaceName =
                  workspaceNames.find((name) => name.includes(workspaceId)) ||
                  'Unknown';
                return {
                  id: [workspaceId], // Ensure id is an array
                  name: [workspaceName], // Ensure name is an array, match by workspaceId or default to 'Unknown'
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
              message: `Feature limit reached for workspaces: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((workspaceId) => {
                // Find the name associated with the workspaceId
                const workspaceName =
                  workspaceNames.find((name) => name.includes(workspaceId)) ||
                  'Unknown';
                return {
                  id: [workspaceId], // Ensure id is an array
                  name: [workspaceName], // Ensure name is an array, match by workspaceId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateWorkspaces.size === 0) {
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
          const cacheKey = `gtm:workspaces:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/workspaces`);
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
      results: successfulUpdates.map((workspaceName) => ({
        workspaceName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (
    successfulUpdates.length > 0 &&
    accountIdForCache &&
    containerIdForCache
  ) {
    const cacheKey = `gtm:workspaces:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.workspaceId is defined before adding it to the array
    const workspaceId = form.workspaceId ? [form.workspaceId] : []; // Provide an empty array as a fallback
    return {
      id: workspaceId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual workspace IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}
'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/lib/schemas/workspaces';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { listGtmAccounts } from './accounts';
import { listGtmContainers } from './containers';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { DeleteWorkspacesResponse } from '@/src/lib/types/types';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateWorkspaceSchema>;
type FormUpdateSchema = z.infer<typeof UpdateWorkspaceSchema>;

// Assuming WorkspaceType is the type for each workspace
interface WorkspaceType {
  containerId: string;
  containerName?: string;
}

/************************************************************************************
  Function to list or get one GTM workspaces
************************************************************************************/
export async function listGtmWorkspaces(
  accessToken: string,
  accountId: string,
  containerId: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const cacheKey = `gtm:workspaces-containerId:${containerId}-userId:${userId}`;
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
        let data;
        await limiter.schedule(async () => {
          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };

          const response = await fetch(url, { headers });

          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}. ${response.statusText}`
            );
          }

          const responseBody = await response.json();
          data = responseBody.workspace;
        });

        // Caching the data in Redis with a 2 hour expiration time
        redis.set(cacheKey, JSON.stringify(data), 'EX', 60 * 60 * 2);

        return data;
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get workspaces...');
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
  Function to list all GTM workspaces in all containers in all accounts
************************************************************************************/
export async function fetchAllWorkspaces(
  accessToken: string
): Promise<WorkspaceType[]> {
  const { userId } = auth();
  const cacheKey = `gtm:all_workspaces-user:${userId}`;

  try {
    // Check Redis cache first
    const cachedWorkspaces = await redis.get(cacheKey);
    if (cachedWorkspaces) {
      return JSON.parse(cachedWorkspaces);
    }

    // If not in cache, fetch from source in parallel
    const allAccounts = await listGtmAccounts(accessToken);
    const allWorkspaces: WorkspaceType[] = [];

    // Create an array of promises for fetching containers
    const containerPromises = allAccounts.map(async (account) => {
      const containers = await listGtmContainers(
        accessToken,
        account.accountId
      );
      const containerMap = new Map<string, string>(
        containers.map((c) => [c.containerId, c.name])
      );

      // Create an array of promises for fetching workspaces within each container
      const workspacePromises = containers.map(async (container) => {
        const workspaces = await listGtmWorkspaces(
          accessToken,
          account.accountId,
          container.containerId
        );

        const enhancedWorkspaces = workspaces.map((workspace) => ({
          ...workspace,
          containerName: containerMap.get(workspace.containerId),
        }));

        return enhancedWorkspaces;
      });

      const workspaceArrays = await Promise.all(workspacePromises);
      const flattenedWorkspaces = workspaceArrays.flat();
      allWorkspaces.push(...flattenedWorkspaces);
    });

    await Promise.all(containerPromises);

    // Cache the result in Redis
    await redis.set(
      cacheKey,
      JSON.stringify(allWorkspaces),
      'EX',
      60 * 60 * 24 * 7 // Cache for 7 days
    );

    return allWorkspaces;
  } catch (error: any) {
    console.error('Error in fetchAllWorkspaces: ', error.message);
    throw error;
  }
}

/************************************************************************************
  Delete a single or multiple workspaces
************************************************************************************/
export async function DeleteWorkspaces(
  accountId: string,
  selectedWorkspaces: Set<string>
): Promise<DeleteWorkspacesResponse> {
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
  const featureLimitReachedWorkspaces: string[] = [];
  const notFoundLimit: string[] = [];
  const toDeleteWorkspaces = new Set<string>(selectedWorkspaces);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: {
        name: 'GTMWorkspaces',
      },
      Subscription: {
        userId: userId,
      },
    },
    include: {
      Feature: true,
      Subscription: true,
    },
  });

  // Handling feature limit
  if (
    !tierLimitRecord ||
    tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
      results: [],
    };
  }

  // Retry loop for deletion requests
  while (retries < MAX_RETRIES && toDeleteWorkspaces.size > 0) {
    try {
      // Enforcing rate limit
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        await limiter.schedule(async () => {
          // Creating promises for each workspace deletion
          const deletePromises = Array.from(toDeleteWorkspaces).map(
            async (data) => {
              const [workspaceId, containerId] = data.split('-');

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
              };

              try {
                const response = await fetch(url, {
                  method: 'DELETE',
                  headers: headers,
                });

                const parsedResponse = await response.json();

                // Handling successful deletion
                if (response.ok) {
                  successfulDeletions.push({ containerId, workspaceId }); // Push as an object
                  toDeleteWorkspaces.delete(data); // Remove from set
                  return { data, success: true };
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
                  ) {
                    notFoundLimit.push(containerId);
                    return {
                      success: false,
                      errorCode: 403,
                      message: 'Feature limit reached',
                    };
                  }
                  errors.push(
                    `Not found or permission denied for container ${containerId}`
                  );
                } else if (response.status === 403) {
                  // Handling feature limit error
                  if (parsedResponse.message === 'Feature limit reached') {
                    featureLimitReachedWorkspaces.push(containerId);
                    return {
                      success: false,
                      errorCode: 403,
                      message: 'Feature limit reached',
                    };
                  }
                } else {
                  // Handling other errors
                  errors.push(
                    `Error deleting container ${containerId}: ${response.status}`
                  );
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(
                  `Error deleting container ${containerId}: ${error.message}`
                );
              }
              toDeleteWorkspaces.delete(data);
              return { containerId, workspaceId, success: false };
            }
          );

          // Awaiting all deletion promises
          const results = await Promise.all(deletePromises);

          results.forEach((result) => {
            if (
              result.success &&
              typeof result.containerId === 'string' &&
              typeof result.workspaceId === 'string'
            ) {
              // Push an object containing both containerId and workspaceId
              successfulDeletions.push({
                containerId: result.containerId,
                workspaceId: result.workspaceId,
              });
            } else {
              // Handle the case where the deletion is not successful
              errors.push(
                `Failed to delete workspace with container ID ${result.containerId} and workspace ID ${result.workspaceId}`
              );
            }
          });

          if (featureLimitReachedWorkspaces.length > 0) {
            throw new Error(
              `Feature limit reached for containers: ${featureLimitReachedWorkspaces.join(
                ', '
              )}`
            );
          }
          // Clear the toDeleteWorkspaces Set to remove old deleted workspaces
          toDeleteWorkspaces.clear();
        });

        if (notFoundLimit.length > 0) {
          return {
            success: false,
            limitReached: true,
            message: `Data/premissions not found: ${notFoundLimit.join(', ')}`,
            results: notFoundLimit.map((containerId, workspaceId) => ({
              containerId,
              workspaceId: String(workspaceId), // Convert workspaceId to string
              success: false,
              notFound: true,
            })),
          };
        }

        if (successfulDeletions.length === selectedWorkspaces.size) {
          break; // Exit loop if all containers are processed successfully
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      // Handling rate limit exceeded error
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying...');
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        console.error('An unexpected error occurred:', error);
        break;
      }
    }
  }

  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitRecord.id },
      data: { deleteUsage: { increment: successfulDeletions.length } },
    });

    // Iterate over each successful deletion to delete the individual workspace cache keys
    for (const { containerId } of successfulDeletions) {
      const specificCacheKey = `gtm:workspaces-containerId:${containerId}-userId:${userId}`;
      await redis.del(specificCacheKey);
    }

    const generalCacheKey = `gtm:all_workspaces-user:${userId}`;
    await redis.del(generalCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    deletedWorkspaces: successfulDeletions.map(
      ({ containerId, workspaceId }) => ({
        containerId,
        workspaceId,
      })
    ),
    errors: errors,
    results: successfulDeletions.map(({ containerId, workspaceId }) => ({
      containerId: `${containerId}-${workspaceId}`,
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

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: Array<{ name: string; containerId: string }> = [];
  const featureLimitReachedContainers: string[] = [];
  const notFoundLimit: string[] = [];

  // Refactor: Use string identifiers in the set
  const toCreateWorkspaces = new Set(
    formData.forms.map((ws) => ({
      accountId: ws.accountId,
      containerId: ws.containerId,
      name: ws.name,
      description: ws.description,
    }))
  );

  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: { name: 'GTMWorkspaces' },
      Subscription: { userId: userId },
    },
    include: { Feature: true, Subscription: true },
  });

  if (
    !tierLimitRecord ||
    tierLimitRecord.createUsage >= tierLimitRecord.createLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
    };
  }

  while (retries < MAX_RETRIES && toCreateWorkspaces.size > 0) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const createPromises = Array.from(toCreateWorkspaces).map(
            async (identifier) => {
              const workspaceData = formData.forms.find(
                (ws) =>
                  ws.accountId === identifier.accountId &&
                  ws.containerId === identifier.containerId &&
                  ws.name === identifier.name &&
                  ws.description === identifier.description
              );

              if (!workspaceData) {
                errors.push(`Workspace data not found for ${identifier}`);
                toCreateWorkspaces.delete(identifier);
                return;
              }

              const formDataToValidate = { forms: [workspaceData] };

              const validationResult =
                CreateWorkspaceSchema.safeParse(formDataToValidate);

              if (!validationResult.success) {
                let errorMessage = validationResult.error.issues
                  .map((issue) => `${issue.path[0]}: ${issue.message}`)
                  .join('. ');
                errors.push(errorMessage);
                toCreateWorkspaces.delete(identifier);
                return { workspaceData, success: false, error: errorMessage };
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces`;

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
              };

              try {
                // Accessing the validated container data
                const validatedworkspaceData = validationResult.data.forms[0];

                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify({
                    accountId: validatedworkspaceData.accountId,
                    name: validatedworkspaceData.name,
                    description: validatedworkspaceData.description,
                    containerId: validatedworkspaceData.containerId,
                  }),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push({
                    name: validatedworkspaceData.name,
                    containerId: validatedworkspaceData.containerId,
                  });
                  toCreateWorkspaces.delete(identifier);
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
                  ) {
                    notFoundLimit.push(
                      `${validatedworkspaceData.containerId}-${validatedworkspaceData.name}`
                    );
                    return {
                      success: false,
                      errorCode: 404,
                      message: 'Feature limit reached',
                    };
                  }
                  errors.push(
                    `Not found or permission denied for container ${name}`
                  );
                } else if (response.status === 403) {
                  // Handling feature limit error
                  if (parsedResponse.message === 'Feature limit reached') {
                    featureLimitReachedContainers.push(
                      validatedworkspaceData.containerId
                    );
                    return {
                      success: false,
                      errorCode: 403,
                      message: 'Feature limit reached',
                    };
                  }
                } else {
                  errors.push(
                    `Error ${response.status} for container ${validatedworkspaceData.containerId}: ${parsedResponse.message}`
                  );
                  toCreateWorkspaces.delete(identifier);
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating container ${name}: ${error.message}`
                );
                toCreateWorkspaces.delete(identifier);
              }
            }
          );

          const results = await Promise.all(createPromises);
          results.forEach((result) => {
            if (result && !result.success) {
              errors.push(
                `Failed to create container ${result}: ${result.error}`
              );
            }
          });

          if (featureLimitReachedContainers.length > 0) {
            throw new Error(
              `Feature limit reached for containers: ${featureLimitReachedContainers.join(
                ', '
              )}`
            );
          }
        });

        if (notFoundLimit.length > 0) {
          return {
            success: false,
            limitReached: true,
            message: `Data/permissions not found: ${notFoundLimit.join(', ')}`,
            results: notFoundLimit.map((cn) => ({
              containerName: cn,
              success: false,
              notFound: true,
            })),
          };
        }

        if (toCreateWorkspaces.size === 0) {
          break;
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying...');
        await new Promise((resolve) =>
          setTimeout(resolve, delay + Math.random() * 200)
        );
        delay *= 2;
        retries++;
      } else {
        console.error('An unexpected error occurred:', error);
        break;
      }
    }
  }

  if (successfulCreations.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitRecord.id },
      data: { createUsage: { increment: successfulCreations.length } },
    });

    // Clearing cache for each unique containerId
    for (const { containerId } of successfulCreations) {
      const cacheKey = `gtm:workspaces-containerId:${containerId}-userId:${userId}`;
      await redis.del(cacheKey);
    }
    const generalCacheKey = `gtm:all_workspaces-user:${userId}`;
    await redis.del(generalCacheKey);

    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  return {
    success: errors.length === 0,
    createdContainers: successfulCreations,
    errors: errors,
    results: successfulCreations.map((containerName) => ({
      containerName,
      success: true,
    })),
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
  const successfulUpdates: Array<{ workspaceId: string; containerId: string }> =
    [];
  const featureLimitReachedUpdates: string[] = [];
  const notFoundLimit: string[] = [];

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

  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: { name: 'GTMWorkspaces' },
      Subscription: { userId: userId },
    },
    include: { Feature: true, Subscription: true },
  });

  if (
    !tierLimitRecord ||
    tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
    };
  }

  while (retries < MAX_RETRIES && toUpdateWorkspaces.size > 0) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const updatePromises = Array.from(toUpdateWorkspaces).map(
            async (identifier) => {
              const workspaceData = formData.forms.find(
                (ws) =>
                  ws.accountId === identifier.accountId &&
                  ws.containerId === identifier.containerId &&
                  ws.name === identifier.name &&
                  ws.description === identifier.description
              );

              if (!workspaceData) {
                errors.push(`Workspace data not found for ${identifier}`);
                toUpdateWorkspaces.delete(identifier);
                return;
              }

              const formDataToValidate = { forms: [workspaceData] };

              const validationResult =
                UpdateWorkspaceSchema.safeParse(formDataToValidate);

              if (!validationResult.success) {
                let errorMessage = validationResult.error.issues
                  .map((issue) => `${issue.path[0]}: ${issue.message}`)
                  .join('. ');
                errors.push(errorMessage);
                toUpdateWorkspaces.delete(identifier);
                return { workspaceData, success: false, error: errorMessage };
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}`;

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
              };

              try {
                // Accessing the validated container data
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

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulUpdates.push({
                    workspaceId: validatedworkspaceData.workspaceId,
                    containerId: validatedworkspaceData.containerId,
                  });
                  toUpdateWorkspaces.delete(identifier);
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
                  ) {
                    notFoundLimit.push(
                      `${validatedworkspaceData.containerId}-${validatedworkspaceData.name}`
                    );
                    return {
                      success: false,
                      errorCode: 404,
                      message: 'Feature limit reached',
                    };
                  }
                  errors.push(
                    `Not found or permission denied for container ${workspaceData.workspaceId}`
                  );
                } else if (response.status === 403) {
                  // Handling feature limit error
                  if (parsedResponse.message === 'Feature limit reached') {
                    featureLimitReachedUpdates.push(
                      validatedworkspaceData.containerId
                    );
                    return {
                      success: false,
                      errorCode: 403,
                      message: 'Feature limit reached',
                    };
                  }
                } else {
                  errors.push(
                    `Error ${response.status} for container ${validatedworkspaceData.containerId}: ${parsedResponse.message}`
                  );
                  toUpdateWorkspaces.delete(identifier);
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating container ${workspaceData.workspaceId}: ${error.message}`
                );
                toUpdateWorkspaces.delete(identifier);
              }
            }
          );

          const results = await Promise.all(updatePromises);
          results.forEach((result) => {
            if (result && !result.success) {
              errors.push(
                `Failed to update workspace ${result}: ${result.error}`
              );
            }
          });

          if (featureLimitReachedUpdates.length > 0) {
            throw new Error(
              `Feature limit reached for containers: ${featureLimitReachedUpdates.join(
                ', '
              )}`
            );
          }
        });

        if (notFoundLimit.length > 0) {
          return {
            success: false,
            limitReached: true,
            message: `Data/permissions not found: ${notFoundLimit.join(', ')}`,
            results: notFoundLimit.map((cn) => ({
              containerName: cn,
              success: false,
              notFound: true,
            })),
          };
        }

        if (toUpdateWorkspaces.size === 0) {
          break;
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying...');
        await new Promise((resolve) =>
          setTimeout(resolve, delay + Math.random() * 200)
        );
        delay *= 2;
        retries++;
      } else {
        console.error('An unexpected error occurred:', error);
        break;
      }
    }
  }

  if (successfulUpdates.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitRecord.id },
      data: { updateUsage: { increment: successfulUpdates.length } },
    });

    // Clearing cache for each unique containerId
    for (const { containerId } of successfulUpdates) {
      const cacheKey = `gtm:workspaces-containerId:${containerId}-userId:${userId}`;
      await redis.del(cacheKey);
    }
    const generalCacheKey = `gtm:all_workspaces-user:${userId}`;
    await redis.del(generalCacheKey);

    revalidatePath(`/dashboard/gtm/workspaces`);
  }

  return {
    success: errors.length === 0,
    updateContainers: successfulUpdates,
    errors: errors,
    results: successfulUpdates.map((name) => ({
      name,
      success: true,
    })),
  };
}

'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/lib/schemas/workspaces';
import logger from '../../../../logger';
import z from 'zod';
import { getURL } from '@/src/lib/helpers';
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
export async function createWorkspaces(
  formData: FormCreateSchema,
  token: string
) {
  const { userId } = auth();
  if (!userId) return notFound();

  try {
    const baseUrl = getURL();
    const errors: string[] = [];
    const forms: any[] = [];

    const plainDataArray =
      formData.forms?.map((fd) => {
        return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
      }) || [];

    // Now pass plainDataArray to CreateWorkspaceSchema.safeParse within an object under the key 'forms'
    const validationResult = CreateWorkspaceSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';

      validationResult.error.format();

      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();

      return {
        error: formattedErrorMessage,
      };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        accountId: formData.accountId,
        name: formData.name,
        description: formData.description,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const featureLimitReachedWorkspaces: string[] = [];

    const createPromises = forms.map(async (workspaceData) => {
      const { accountId, description, containerId, name } = workspaceData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        description: description,
        containerId: containerId,
        accountId: accountId,
        name: name,
      };

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`,
        {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 400) {
        const parsedResponse = await response.json();
        console.log('parsedResponse', parsedResponse);
      }

      if (!response.ok) {
        // Log error details for debugging
        console.error(`Response Error: Status ${response.status}`);

        // Handle error responses
        if (response.status === 403) {
          const parsedResponse = await response.json();
          if (parsedResponse.message === 'Feature limit reached') {
            featureLimitReachedWorkspaces.push(workspaceData.name);
            return {
              success: false,
              errorCode: 403,
              message: 'Feature limit reached',
            };
          }
        }

        // Add error for non-200 responses
        errors.push(
          `Failed to create workspace(s) with name ${workspaceData.name} in account ${workspaceData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to create',
        };
      }

      const createdWorkspace = await response.json();

      return { success: true, createdWorkspace };
    });

    const results = await Promise.all(createPromises);

    if (featureLimitReachedWorkspaces.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for workspaces: ${featureLimitReachedWorkspaces.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      const accessToken = await currentUserOauthAccessToken(userId);
      const cacheKey = `user:${userId}-gtm:all_workspaces`;
      await redis.del(cacheKey);

      // Optionally, fetch and cache the updated list of workspaces
      const updatedWorkspaces = await fetchAllWorkspaces(accessToken[0].token); // A function to fetch all workspaces
      await redis.set(
        cacheKey,
        JSON.stringify(updatedWorkspaces),
        'EX',
        60 * 60 * 24 * 7
      );

      /* const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?  */

      const path = `/dashboard/gtm/workspaces`;

      revalidatePath(path);

      return {
        success: true,
        limitReached: false,
        createdWorkspaces: results
          .filter((r) => r.success)
          .map((r) => r.createdWorkspace),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return {
      success: false,
      limitReached: false,
      message: error.message,
    };
  }
}

/************************************************************************************
  Udpate a single container or multiple containers
************************************************************************************/
export async function updateWorkspaces(
  formData: FormUpdateSchema,
  token: string
) {
  const { userId } = auth();
  if (!userId) return notFound();

  try {
    const baseUrl = getURL();
    const errors: string[] = [];
    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    const validationResult = UpdateWorkspaceSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';
      validationResult.error.format();
      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();
      return { error: formattedErrorMessage };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        accountId: formData.accountId,
        workspaceId: formData.workspaceId,
        name: formData.name,
        description: formData.description,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const featureLimitReachedWorkspaces: string[] = [];

    const updatePromises = forms.map(async (workspaceData) => {
      const payload = {
        description: workspaceData.description,
        containerId: workspaceData.containerId,
        accountId: workspaceData.accountId,
        name: workspaceData.name,
        workspaceId: workspaceData.workspaceId,
      };

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}`,
        {
          method: 'PATCH',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 403) {
        const updatedWorkspace = await response.json();
        if (updatedWorkspace.message === 'Feature limit reached') {
          featureLimitReachedWorkspaces.push(workspaceData.name);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (response.ok) {
        // Revalidate the path for the updated workspace
        const workspacePath = `/dashboard/gtm/workspaces`;
        revalidatePath(workspacePath);

        const updatedWorkspace = await response.json();
        return { success: true, updatedWorkspace };
      } else {
        errors.push(
          `Failed to update workspace with name ${workspaceData.name} in account ${workspaceData.accountId}: ${response.status}`
        );
        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to update',
        };
      }
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReachedWorkspaces.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for workspaces: ${featureLimitReachedWorkspaces.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      const accessToken = await currentUserOauthAccessToken(userId);
      const cacheKey = `user:${userId}-gtm:all_workspaces`;
      await redis.del(cacheKey);

      // Optionally, fetch and cache the updated list of workspaces
      const updatedWorkspaces = await fetchAllWorkspaces(accessToken[0].token); // A function to fetch all workspaces
      await redis.set(
        cacheKey,
        JSON.stringify(updatedWorkspaces),
        'EX',
        60 * 60 * 24 * 7
      );

      /* const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?  */

      const path = `/dashboard/gtm/workspaces`;

      revalidatePath(path);

      return {
        success: true,
        limitReached: false,
        updatedWorkspaces: results
          .filter((r) => r.success)
          .map((r) => r.updatedWorkspace),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return { success: false, limitReached: false, message: error.message };
  }
}

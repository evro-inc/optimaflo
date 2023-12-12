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
  workspaces: { containerId: string; workspaceId: string }[],
  token: string
) {
  const { userId } = auth();
  if (!userId) return notFound();

  try {
    const errors: string[] = [];
    const baseUrl = getURL();

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const deletionPromises = workspaces.map(
      async ({ containerId, workspaceId }) => {
        const response = await fetch(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
          {
            method: 'DELETE',
            headers: requestHeaders,
          }
        );

        if (response.status === 403) {
          const parsedResponse = await response.json();
          if (parsedResponse.message === 'Feature limit reached') {
            throw { message: 'Feature limit reached' }; // throw a plain object instead
          }
        }

        if (!response.ok) {
          errors.push(
            `Failed to delete workspace ${workspaceId} in account ${accountId}: ${response.status}`
          );

          return {
            success: false,
            errorCode: response.status,
            message: 'Failed to delete',
          };
        }
        const accessToken = await currentUserOauthAccessToken(userId);
        const cacheKey = `user:${userId}-gtm:all_workspaces`;
        await redis.del(cacheKey);

        // Optionally, fetch and cache the updated list of workspaces
        const deletedWorkspaces = await fetchAllWorkspaces(
          accessToken[0].token
        ); // A function to fetch all workspaces
        await redis.set(
          cacheKey,
          JSON.stringify(deletedWorkspaces),
          'EX',
          60 * 60 * 24 * 7
        );

        /* const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?  */

        const path = `/dashboard/gtm/workspaces`;

        revalidatePath(path);

        return { success: true, containerId, workspaceId };
      }
    );
    const results = await Promise.all(deletionPromises);

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      return {
        success: true,
        limitReached: false,
        deletedWorkspaces: results,
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


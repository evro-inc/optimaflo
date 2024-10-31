'use server';
import { revalidatePath } from 'next/cache';
import { FormSchema } from '@/src/lib/schemas/gtm/envs';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureRateLimits,
  executeApiRequest,
  getOauthToken,
  handleApiResponseError,
  softRevalidateFeatureCache,
  tierUpdateLimit,
  validateFormData,
} from '@/src/utils/server';
import { GoogleTagEnvironmentType } from '@/src/lib/schemas/gtm/envs';

const featureType: string = 'GTMEnvs';

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

/************************************************************************************
  Function to list GTM envs
************************************************************************************/
export async function listGtmEnvs(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:environments:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.hgetall(cacheKey);

    if (Object.keys(cacheData).length > 0) {
      try {
        const parsedData = Object.values(cacheData).map((data) => JSON.parse(data));

        return parsedData;
      } catch (error) {
        console.error('Failed to parse cache data:', error);
        await redis.del(cacheKey);
      }
    }
  }

  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { gtm: true },
  });

  if (!data) return [];

  try {
    await ensureRateLimits(userId);
  } catch (error: any) {
    // Log the error and return an empty array or handle it gracefully
    console.error('Rate limit exceeded:', error.message);
    return []; // Return an empty array to match the expected type
  }

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
          containerId: item.containerId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  const urls = uniqueItems.map(
    ({ accountId, containerId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/environments`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    const flattenedData = allData.flat();
    const cleanedData = flattenedData.filter((item) => Object.keys(item).length > 0);
    const ws = cleanedData.flatMap((item) => item.environment || []); // Flatten to get all workspaces directly

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      ws.forEach((ws: any) => {
        const fieldKey = `${ws.accountId}/${ws.containerId}/${ws.environmentId}`; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(ws));
        } else {
          console.warn('Skipping workspace with undefined name:', ws);
        }
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return ws; // Return only the ws array
  } catch (apiError) {
    console.error('Error fetching ws from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Function to list GTM envs
************************************************************************************/
export async function getGtmEnv(formData: GoogleTagEnvironmentType) {
  let retries = 0;
  let delay = INITIAL_DELAY;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  // Ensure environmentId is always an array
  const toGetEnv = new Set(
    formData.forms.map((env) => ({
      accountId: env.accountId,
      containerId: env.containerId,
      name: env.name,
      description: env.description,
      envIds: Array.isArray(env.environmentId) ? env.environmentId : [env.environmentId],
    }))
  );

  const errors: string[] = [];
  const successfulFetches: any[] = [];
  const notFoundEnvs: { id: string; name: string }[] = [];
  let permissionDenied = false;

  while (retries < MAX_RETRIES && toGetEnv.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const getPromises = Array.from(toGetEnv).map(async (env) => {
            const fetchEnvPromises = env.envIds.map(async (envIdString) => {
              if (typeof envIdString === 'string') {
                const [accountId, containerId, , envId] = envIdString.split('-');
                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/environments/${envId}`;

                const headers = {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const response = await fetch(url, {
                    method: 'GET',
                    headers: headers,
                  });

                  if (!response.ok) {
                    throw new Error(
                      `HTTP error! status: ${response.status}. ${response.statusText}`
                    );
                  }

                  const responseBody = await response.json();

                  allData.push(responseBody.environment || []);
                  successfulFetches.push({
                    id: responseBody.environmentId,
                    name: responseBody.name,
                  });
                } catch (error: any) {
                  if (error.code === 404) {
                    notFoundEnvs.push({ id: envIdString, name: env.name });
                  } else {
                    errors.push(`Error fetching data for ${envIdString}: ${error.message}`);
                  }
                }
              } else {
                console.error('env.envId is not a valid string:', envIdString);
              }
            });

            await Promise.all(fetchEnvPromises);
          });

          await Promise.all(getPromises);
        });

        if (notFoundEnvs.length > 0) {
          return {
            success: false,
            limitReached: false,
            notFoundError: true,
            features: [],
            results: notFoundEnvs.map((item) => ({
              id: [item.id],
              name: [item.name],
              success: false,
              notFound: true,
            })),
          };
        }

        if (successfulFetches.length === formData.forms.length) {
          break;
        }

        if (toGetEnv.size === 0) {
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
      if (userId) {
        const cacheKey = `gtm:envs:userId:${userId}`;
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
      features: successfulFetches,
      errors: errors,
      results: successfulFetches.map((env) => ({
        id: [env.id],
        name: [env.name],
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  return {
    success: true,
    features: [],
    errors: [],
    limitReached: false,
    message: 'Environments fetched successfully',
    results: successfulFetches.map((env) => ({
      id: [env.id],
      name: [env.name],
      success: true,
    })),
    notFoundError: false,
  };
}

/************************************************************************************
  Udpate GTM Environments
************************************************************************************/
export async function UpdateEnvs(formData: {
  forms: GoogleTagEnvironmentType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }

  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'update'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available updates.',
      errors: [
        `Cannot update more permissions than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulUpdates: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${validatedData.accountId}/containers/${validatedData.containerId}/environments/${validatedData.envNumber}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      const body = JSON.stringify({
        accountId: validatedData.forms[0].environment.accountId,
        name: validatedData.forms[0].environment.name,
        containerId: validatedData.forms[0].environment.containerId,
        envId: validatedData.forms[0].environment.environmentId.split('-')[0],
        containerVersionId: validatedData.forms[0].environment.containerVersionId,
      });

      try {
        const res = await executeApiRequest(url, {
          method: 'PUT',
          headers,
          body: body,
        });

        successfulUpdates.push(res);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { updateUsage: { increment: 1 } },
        });

        // Immediate revalidation per each update is not needed, aggregate revalidation is better
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(validatedData.forms[0].name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({
            id: validatedData.forms[0].parent,
            name: validatedData.forms[0].name,
          });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Updates**:
  if (successfulUpdates.length > 0) {
    try {
      // Only revalidate the affected properties
      const operations = successfulUpdates.map((update) => ({
        crudType: 'update' as const, // Explicitly set the type as "update"
        data: { ...update },
      }));

      const cacheFields = successfulUpdates.map((update) => `${update.name}`);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`gtm:environments:userId:${userId}`],
        `/dashboard/gtm/entities`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Check for not found errors and return if any
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some environments could not be found: ${notFoundLimit
        .map((item) => item.name)
        .join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [], // Ensure id is an array and filter out undefined
        name: [item.name], // Ensure name is an array to match FeatureResult type
        success: false,
        notFound: true,
      })),
    };
  }

  // Check if feature limit is reached and return response if applicable
  if (featureLimitReached.length > 0) {
    return {
      success: false,
      limitReached: true,
      notFoundError: false,
      message: `Feature limit reached for environments: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((propertyName) => ({
        id: [], // Populate with actual property IDs if available
        name: [propertyName], // Wrap the string in an array
        success: false,
        featureLimitReached: true,
      })),
    };
  }

  // Handle general errors
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      results: [],
      message: errors.join(', '),
      notFoundError: notFoundLimit.length > 0,
    };
  }

  return {
    success: true,
    message: `Successfully updated ${successfulUpdates.length} environment(s)`,
    features: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate this with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
  };
}

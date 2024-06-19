'use server';
import { revalidatePath } from 'next/cache';
import { FormSchema } from '@/src/lib/schemas/gtm/envs';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';
import { GoogleTagEnvironmentType } from '@/src/lib/schemas/gtm/envs';
import { EnvironmentApi } from 'svix/dist/openapi';

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;

/************************************************************************************
  Function to list GTM envs
************************************************************************************/
export async function listGtmEnvs() {
  let retries = 0;
  let delay = INITIAL_DELAY;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:environments:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue);
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
            gtmData.gtm.map((data) => `${data.accountId}-${data.containerId}`)
          );

          const urls = Array.from(uniquePairs).map((pair: any) => {
            const [accountId, containerId] = pair.split('-');
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/environments`;
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
              allData.push(responseBody.environment || []);
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
  Function to list GTM envs
************************************************************************************/
export async function getGtmEnv(formData: GoogleTagEnvironmentType) {
  let retries = 0;
  let delay = INITIAL_DELAY;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  console.log('formData', formData);

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

  await fetchGtmSettings(userId);

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
            console.log('env g', env);

            const fetchEnvPromises = env.envIds.map(async (envIdString) => {
              if (typeof envIdString === 'string') {
                const [accountId, containerId, , envId] = envIdString.split('-');
                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/environments/${envId}`;

                const headers = {
                  Authorization: `Bearer ${accessToken}`,
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
                  console.log('responseBody', responseBody);

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
export async function UpdateEnvs(formData: GoogleTagEnvironmentType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData update', formData);

  let retries = 0;
  let delay = INITIAL_DELAY;
  const errors: string[] = [];
  const successfulUpdates: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toUpdateEnvs = new Set(
    formData.forms.map((env) => ({
      accountId: env.accountId,
      containerId: env.containerId,
      name: env.name,
      description: env.description,
      envId: env.environmentId.split('-')[0],
    }))
  );

  console.log('toUpdateEnvs update', toUpdateEnvs);

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMEnvs');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    envName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating Envs',
      results: [],
    };
  }

  if (toUpdateEnvs.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateEnvs).map((identifier) => {
      const { name: envName } = identifier;
      return {
        id: [], // No env ID since update did not happen
        name: envName, // Include the env name from the identifier
        success: false,
        message: `Update limit reached. Cannot update env "${envName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateEnvs.size} envs as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateEnvs.size} envs as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const envNames = formData.forms.map((cd) => cd.name);

  if (toUpdateEnvs.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateEnvs.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateEnvs).map(async (identifier) => {
              console.log('identifier', identifier);

              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;

              const envData = formData.forms.find(
                (env) =>
                  env.accountId === identifier.accountId &&
                  env.containerId === identifier.containerId &&
                  env.name === identifier.name &&
                  env.description === identifier.description &&
                  env.environmentId.split('-')[0] === identifier.envId
              );

              console.log('envData update', envData);

              if (!envData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdateEnvs.delete(identifier);
                return;
              }

              const envNumber = envData.environmentId.split('-')[0];

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${envData.accountId}/containers/${envData.containerId}/environments/${envNumber}`;

              console.log('url update', url);

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [envData] };
                console.log('formDataToValidate update', formDataToValidate);

                const validationResult = FormSchema.safeParse(formDataToValidate);

                console.log('validationResult update', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateEnvs.delete(identifier);
                  return {
                    envData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated env data
                const validatedenvData = validationResult.data.forms[0];

                console.log('validatedenvData update', validatedenvData);

                const payload = JSON.stringify({
                  accountId: validatedenvData.accountId,
                  name: validatedenvData.environmentId.split('-')[1],
                  description: validatedenvData.description,
                  containerId: validatedenvData.containerId,
                  envId: validatedenvData.environmentId.split('-')[0],
                  containerVersionId: validatedenvData.containerVersionId,
                });

                console.log('payload update', payload);

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: payload,
                });

                console.log('response update', response);

                const parsedResponse = await response.json();

                console.log('parsedResponse update', parsedResponse);

                const envName = envData.name;

                if (response.ok) {
                  if (response.ok) {
                    // Push a string into the array, for example, a concatenation of envId and containerId
                    successfulUpdates.push(
                      `${validatedenvData.environmentId}-${validatedenvData.containerId}`
                    );
                    // ... rest of your code
                  }
                  toUpdateEnvs.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  UpdateResults.push({
                    envName: envName,
                    success: true,
                    message: `Successfully updated env ${envName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'env',
                    [envName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(envName);
                    } else if (errorResult.errorCode === 404) {
                      const envName =
                        envNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: envName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for env ${envName}.`);
                  }

                  toUpdateEnvs.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    envName: envName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception updating env ${envData.environmentId}: ${error.message}`);
                toUpdateEnvs.delete(identifier);
                UpdateResults.push({
                  envName: envData.name,
                  success: false,
                  message: error.message,
                });
              }
            });

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
              message: `Feature limit reached for envs: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((envId) => {
                // Find the name associated with the envId
                const envName = envNames.find((name) => name.includes(envId)) || 'Unknown';
                return {
                  id: [envId], // Ensure id is an array
                  name: [envName], // Ensure name is an array, match by envId or default to 'Unknown'
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
              message: `Feature limit reached for envs: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((envId) => {
                // Find the name associated with the envId
                const envName = envNames.find((name) => name.includes(envId)) || 'Unknown';
                return {
                  id: [envId], // Ensure id is an array
                  name: [envName], // Ensure name is an array, match by envId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateEnvs.size === 0) {
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
          const cacheKey = `gtm:envs:userId:${userId}`;
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
      features: successfulUpdates,
      errors: errors,
      results: successfulUpdates.map((envName) => ({
        envName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:envs:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.envId is defined before adding it to the array
    const envId = form.environmentId ? [form.environmentId] : []; // Provide an empty array as a fallback
    return {
      id: envId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual env IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

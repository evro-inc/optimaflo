'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs';
import { gaRateLimit, gtmRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, KeyEventType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings, fetchGtmSettings } from '../..';
import { ContainerVersionType } from '@/src/lib/schemas/gtm/versions';

/************************************************************************************
  Function to list GA Versions
************************************************************************************/
export async function listGTMVersionHeaders() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:versionHeaders:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  await fetchGASettings(userId);

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
      const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniquePairs = new Set(
            gtmData.gtm.map((data) => `${data.accountId}-${data.containerId}`)
          );

          const urls = Array.from(uniquePairs).map((pair: any) => {
            const [accountId, containerId] = pair.split('-');
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/version_headers`;
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

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
              }
              allData.push(responseBody);
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

        redis.set(cacheKey, JSON.stringify(allData), 'EX', 3600);

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
  Create a single GTM version or multiple GTM versions
************************************************************************************/

export async function publishGTM(formData: ContainerVersionType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData pub: ', formData);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulPublishes: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toPublishVersions = new Set(
    formData.forms.map((prop) => ({
      accountId: prop.accountId,
      containerId: prop.containerId,
      versionId: prop.containerVersionId,
      name: prop.name,
    }))
  );
  console.log('toPublishVersions pub:', toPublishVersions);

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMVersions');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const publishResults: {
    workspaceName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for publishing versions',
      results: [],
    };
  }

  if (toPublishVersions.size > availableUpdateUsage) {
    const attemptedPublishes = Array.from(toPublishVersions).map((identifier) => {
      const { name: workspaceName } = identifier;
      return {
        id: [], // No workspace ID since publish did not happen
        name: workspaceName, // Include the workspace name from the identifier
        success: false,
        message: `Update limit reached. Cannot publish version for workspace "${workspaceName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot publish ${toPublishVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot publish ${toPublishVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedPublishes,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const workspaceNames = formData.forms.map((cd) => cd.name);

  if (toPublishVersions.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toPublishVersions.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const publishPromises = Array.from(toPublishVersions).map(async (identifier) => {
              console.log('Identifier pub:', identifier);

              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;
              const versionData = formData.forms.find(
                (prop) =>
                  prop.accountId === identifier.accountId &&
                  prop.containerId === identifier.containerId &&
                  prop.containerVersionId === identifier.versionId
              );

              console.log('Version data pub:', versionData);

              if (!versionData) {
                errors.push(`Version data not found for ${identifier}`);
                toPublishVersions.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${versionData.accountId}/containers/${versionData.containerId}/versions/${versionData.containerVersionId}:publish`;

              console.log('URL pub:', url);

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                });
                console.log('Response pub:', response);

                const parsedResponse = await response.json();

                const workspaceName = versionData.name;

                if (response.ok) {
                  successfulPublishes.push(
                    `${versionData.containerVersionId}-${versionData.containerId}`
                  );
                  toPublishVersions.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  publishResults.push({
                    workspaceName: workspaceName,
                    success: true,
                    message: `Successfully published version for workspace ${workspaceName}`,
                  });
                } else {
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
                        workspaceNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: workspaceName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for workspace ${workspaceName}.`);
                  }

                  toPublishVersions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  publishResults.push({
                    workspaceName: workspaceName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception publishing version for workspace ${versionData.containerVersionId}: ${error.message}`
                );
                toPublishVersions.delete(identifier);
                publishResults.push({
                  workspaceName: versionData.name,
                  success: false,
                  message: error.message,
                });
              }
            });

            await Promise.all(publishPromises);
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
              message: `Feature limit reached for workspaces: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((workspaceId) => {
                // Find the name associated with the workspaceId
                const workspaceName =
                  workspaceNames.find((name) => name.includes(workspaceId)) || 'Unknown';
                return {
                  id: [workspaceId], // Ensure id is an array
                  name: [workspaceName], // Ensure name is an array, match by workspaceId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulPublishes.length === formData.forms.length) {
            break;
          }

          if (toPublishVersions.size === 0) {
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
          const cacheKey = `gtm:workspaces:userId:${userId}`;
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
      features: successfulPublishes,
      errors: errors,
      results: successfulPublishes.map((workspaceName) => ({
        workspaceName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulPublishes.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:workspaces:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.workspaceId is defined before adding it to the array
    const workspaceId = form.containerVersionId ? [form.containerVersionId] : []; // Provide an empty array as a fallback
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
    message: 'Versions published successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

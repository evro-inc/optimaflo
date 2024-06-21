'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs';
import { gaRateLimit, gtmRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import {
  FeatureResult,
  FeatureResponse,
  KeyEventType,
  GTMContainerVersion,
} from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings, fetchGtmSettings } from '../..';
import { ContainerVersionType, UpdateVersionSchemaType } from '@/src/lib/schemas/gtm/versions';
import { UpdateVersionFormSchema } from '@/src/lib/schemas/gtm/versions';
import { container, container_v1 } from 'googleapis/build/src/apis/container';

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
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableUpdateUsage = limit - createUsage;

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
                    data: { createUsage: { increment: 1 } },
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

/************************************************************************************
  Delete a single or multiple versions
************************************************************************************/
export async function DeleteVersions(
  versionsToDelete: GTMContainerVersion[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
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

  const versionsToDeleteMappedData = new Set(
    versionsToDelete.map(
      (prop) => `${prop.accountId}-${prop.containerId}-${prop.containerVersionId}`
    )
  );
  let accountIdForCache: string | undefined;

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMVersions');
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
      message: 'Feature limit reached for deleting versions',
      results: [],
    };
  }

  if (versionsToDeleteMappedData.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${versionsToDeleteMappedData.size} versions as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${versionsToDeleteMappedData.size} versions as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (versionsToDeleteMappedData.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && versionsToDeleteMappedData.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(versionsToDelete).map(async (prop) => {
              const { accountId, containerId, containerVersionId } = prop;
              accountIdForCache = accountId;

              let url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/versions/${containerVersionId}?`;

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
                  containerIdsProcessed.add(containerId);
                  successfulDeletions.push({
                    combinedId: `${accountId}-${containerId}-${containerVersionId}`,
                    name: prop.name,
                  });

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  versionsToDeleteMappedData.delete(
                    `${accountId}-${containerId}-${containerVersionId}`
                  );
                  fetchGtmSettings(userId);

                  return {
                    combinedId: `${accountId}-${containerId}-${containerVersionId}`,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'version',
                    [prop.name]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        combinedId: `${accountId}-${containerId}-${containerVersionId}`,
                        name: prop.name,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        combinedId: `${accountId}-${containerId}-${containerVersionId}`,
                        name: prop.name,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for versions.`);
                  }

                  versionsToDeleteMappedData.delete(
                    `${accountId}-${containerId}-${containerVersionId}`
                  );
                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(
                  `Error deleting version ${accountId}-${containerId}-${containerVersionId}: ${error.message}`
                );
              }
              containerIdsProcessed.add(containerId);
              versionsToDeleteMappedData.delete(
                `${accountId}-${containerId}-${containerVersionId}`
              );
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
              message: `Could not delete version. Please check your permissions. Container Name: 
              ${notFoundLimit
                .map(({ name }) => name)
                .join(', ')}. All other variables were successfully deleted.`,
              results: notFoundLimit.map(({ combinedId, name }) => {
                const [accountId, containerId, containerVersionId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, containerVersionId], // Ensure id is an array
                  name: [name],
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
              message: `Feature limit reached for version: ${featureLimitReached
                .map(({ combinedId }) => combinedId)
                .join(', ')}`,
              results: featureLimitReached.map(({ combinedId, name }) => {
                const [accountId, containerId, containerVersionId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, containerVersionId], // Ensure id is an array
                  name: [name], // Ensure name is an array, use the name from featureLimitReached
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === versionsToDelete.length) {
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
        const cacheKey = `gtm:versionHeaders:userId:${userId}`;
        await redis.del(cacheKey);

        await revalidatePath(`/dashboard/gtm/entities`);
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
        const [accountId, containerId, containerVersionId] = combinedId.split('-');
        return {
          id: [accountId, containerId, containerVersionId], // Ensure id is an array
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
    const specificCacheKey = `gtm:versionHeaders:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/entities`);
  }

  const totalDeletedVariables = successfulDeletions.length;

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedVariables} versions(s)`,
    features: successfulDeletions.map(({ combinedId }) => combinedId),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ combinedId, name }) => {
      const [accountId, containerId, containerVersionId] = combinedId.split('-');
      return {
        id: [accountId, containerId, containerVersionId], // Ensure id is an array
        name: [name], // Ensure name is an array
        success: true,
      };
    }),
  };
}

/************************************************************************************
  Udpate a single multiple versions
************************************************************************************/
export async function UpdateVersions(formData: UpdateVersionSchemaType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData up: ', formData);

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
  const toUpdateVersions = new Set(
    formData.updateVersion.map((prop) => ({
      accountId: prop.accountId,
      containerId: prop.containerId,
      containerVersionId: prop.containerVersionId,
      name: prop.name,
      description: prop.description,
    }))
  );

  console.log('toUpdateVersions up:', toUpdateVersions);

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMVersions');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    versionName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating versions',
      results: [],
    };
  }

  if (toUpdateVersions.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateVersions).map((identifier) => {
      const { name: versionName } = identifier;
      return {
        id: [], // No version ID since update did not happen
        name: versionName, // Include the version name from the identifier
        success: false,
        message: `Update limit reached. Cannot update version "${versionName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const versionNames = formData.updateVersion.map((cd) => cd.name);

  if (toUpdateVersions.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateVersions.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateVersions).map(async (identifier) => {
              console.log('Identifier ver up:', identifier);

              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;
              const versionData = formData.updateVersion.find(
                (prop) =>
                  prop.accountId === identifier.accountId &&
                  prop.containerId === identifier.containerId &&
                  prop.containerVersionId === identifier.containerVersionId &&
                  prop.name === identifier.name &&
                  prop.description === identifier.description
              );

              if (!versionData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdateVersions.delete(identifier);
                return;
              }

              console.log('Version data ver up:', versionData);

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${versionData.accountId}/containers/${versionData.containerId}/versions/${versionData.containerVersionId}`;
              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { updateVersion: [versionData] };

                console.log('Form data ver up:', formDataToValidate);

                const validationResult = UpdateVersionFormSchema.safeParse(formDataToValidate);

                console.log('Validation result ver up:', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateVersions.delete(identifier);
                  return {
                    versionData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated version data
                const validatedversionData = validationResult.data.updateVersion[0];
                const payload = JSON.stringify({
                  accountId: validatedversionData.accountId,
                  name: validatedversionData.name,
                  description: validatedversionData.description,
                  containerId: validatedversionData.containerId,
                  containerVersionId: validatedversionData.containerVersionId,
                });

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: payload,
                });

                console.log('Response ver up:', response);

                const parsedResponse = await response.json();
                console.log('Parsed response ver up:', parsedResponse);

                const versionName = versionData.name;

                if (response.ok) {
                  if (response.ok) {
                    // Push a string into the array, for example, a concatenation of versionId and containerId
                    successfulUpdates.push(
                      `${validatedversionData.containerVersionId}-${validatedversionData.containerId}`
                    );
                    // ... rest of your code
                  }
                  toUpdateVersions.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  UpdateResults.push({
                    versionName: versionName,
                    success: true,
                    message: `Successfully updated version ${versionName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'version',
                    [versionName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(versionName);
                    } else if (errorResult.errorCode === 404) {
                      const versionName =
                        versionNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: versionName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for version ${versionName}.`);
                  }

                  toUpdateVersions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    versionName: versionName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception updating version ${versionData.containerVersionId}: ${error.message}`
                );
                toUpdateVersions.delete(identifier);
                UpdateResults.push({
                  versionName: versionData.name,
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
              message: `Feature limit reached for versions: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((versionId) => {
                // Find the name associated with the versionId
                const versionName =
                  versionNames.find((name) => name.includes(versionId)) || 'Unknown';
                return {
                  id: [versionId], // Ensure id is an array
                  name: [versionName], // Ensure name is an array, match by versionId or default to 'Unknown'
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
              message: `Feature limit reached for versions: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((versionId) => {
                // Find the name associated with the versionId
                const versionName =
                  versionNames.find((name) => name.includes(versionId)) || 'Unknown';
                return {
                  id: [versionId], // Ensure id is an array
                  name: [versionName], // Ensure name is an array, match by versionId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.updateVersion.length) {
            break;
          }

          if (toUpdateVersions.size === 0) {
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
          const cacheKey = `gtm:versionHeaders:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/entities`);
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
      results: successfulUpdates.map((versionName) => ({
        versionName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:versionHeaders:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/entities`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.updateVersion.map((form) => {
    // Ensure that form.versionId is defined before adding it to the array
    const versionId = form.containerVersionId ? [form.containerVersionId] : []; // Provide an empty array as a fallback
    return {
      id: versionId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual version IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

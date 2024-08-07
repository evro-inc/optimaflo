'use server';
import { revalidatePath } from 'next/cache';
import { FormsSchema } from '@/src/lib/schemas/gtm/builtInVariables';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { BuiltInVariable, FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof FormsSchema>;
type FormUpdateSchema = z.infer<typeof FormsSchema>;

/************************************************************************************
  Function to list or get one GTM builtInVariables
************************************************************************************/
export async function listGtmBuiltInVariables(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:builtInVariables:userId:${userId}`;
  if (!skipCache) {
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
            gtmData.gtm.map((data) => `${data.accountId}-${data.containerId}-${data.workspaceId}`)
          );

          const urls = Array.from(uniquePairs).map((pair: any) => {
            const [accountId, containerId, workspaceId] = pair.split('-');
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables`;
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

              allData.push(responseBody.builtInVariable || []);
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
  Delete a single or multiple builtInVariables
************************************************************************************/
export async function DeleteBuiltInVariables(
  ga4BuiltInVarToDelete: BuiltInVariable[]
): Promise<FeatureResponse> {
  // Constants for retry mechanism
  const MAX_RETRIES = 3;
  let retries = 0;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{ combinedId: string; name: string }> = [];
  const featureLimitReached: Array<{ combinedId: string; name: string }> = [];
  const notFoundLimit: Array<{ combinedId: string; name: string }> = [];

  // Logging the variables to delete

  // Grouping variables by their combinedId (accountId, containerId, workspaceId)
  const groupedVars = new Map<string, BuiltInVariable[]>();
  ga4BuiltInVarToDelete.forEach((prop) => {
    const combinedId = `${prop.accountId}-${prop.containerId}-${prop.workspaceId}`;
    if (!groupedVars.has(combinedId)) {
      groupedVars.set(combinedId, []);
    }
    groupedVars.get(combinedId)?.push(prop);
  });

  // Authenticating user and getting user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMBuiltInVariables');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;

  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting BuiltInVariables',
      results: [],
    };
  }

  if (groupedVars.size > availableDeleteUsage) {
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${groupedVars.size} builtInVariables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${groupedVars.size} builtInVariables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }

  let permissionDenied = false;

  // Retry loop for deletion requests
  while (retries < MAX_RETRIES && groupedVars.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        await limiter.schedule(async () => {
          const deletePromises = Array.from(groupedVars.entries()).map(
            async ([combinedId, props]) => {
              const { accountId, containerId, workspaceId } = props[0];
              const types = props.map((prop) => prop.type).join('&type=');
              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables?type=${types}`;

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
                  successfulDeletions.push({
                    combinedId: `${accountId}-${containerId}-${workspaceId}`,
                    name: types,
                  });

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  fetchGtmSettings(userId);

                  return {
                    combinedId: `${accountId}-${containerId}-${workspaceId}`,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'builtInVariable',
                    types.split('&type=')
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: types,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: types,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for built-in variable types ${types}.`);
                  }

                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                errors.push(
                  `Error deleting built-in variable ${accountId}-${containerId}-${workspaceId}: ${error.message}`
                );
              }

              return { containerId, success: false };
            }
          );

          await Promise.all(deletePromises);
        });

        if (notFoundLimit.length > 0) {
          return createErrorResponse(notFoundLimit, true);
        }

        if (featureLimitReached.length > 0) {
          return createErrorResponse(featureLimitReached, false, true);
        }

        if (successfulDeletions.length === ga4BuiltInVarToDelete.length) {
          break;
        }

        if (permissionDenied) {
          break;
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        break;
      }
    } finally {
      await redis.del(`gtm:builtInVariables:userId:${userId}`);
      await revalidatePath('/dashboard/gtm/configurations');
    }
  }

  if (permissionDenied) {
    return createErrorResponse(errors);
  }

  if (errors.length > 0) {
    return createErrorResponse(errors, false, false, successfulDeletions);
  }

  if (successfulDeletions.length > 0) {
    await redis.del(`gtm:builtInVariables:userId:${userId}`);
    revalidatePath('/dashboard/gtm/configurations');
  }

  return createSuccessResponse(successfulDeletions);
}

function createErrorResponse(
  errors: any,
  notFoundError = false,
  limitReached = false,
  successfulDeletions = []
) {
  return {
    success: false,
    features: successfulDeletions.map(({ combinedId }) => combinedId),
    errors: errors,
    results: successfulDeletions.map(({ combinedId, name }) => {
      const [accountId, containerId, workspaceId] = combinedId.split('-');
      return {
        id: [accountId, containerId, workspaceId],
        name: [name],
        success: true,
      };
    }),
    message: errors.join(', '),
    notFoundError,
    limitReached,
  };
}

function createSuccessResponse(successfulDeletions: Array<{ combinedId: string; name: string }>) {
  return {
    success: true,
    message: `Successfully deleted ${successfulDeletions.length} built-in variable(s)`,
    features: successfulDeletions.map(({ combinedId }) => combinedId),
    errors: [],
    notFoundError: false,
    results: successfulDeletions.map(({ combinedId, name }) => {
      const [accountId, containerId, workspaceId] = combinedId.split('-');
      return {
        id: [accountId, containerId, workspaceId],
        name: [name],
        success: true,
      };
    }),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateBuiltInVariables(formData: FormCreateSchema) {
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
  const toCreateBuiltInVariables = new Set(
    formData.forms.flatMap((form) =>
      Array.isArray(form.entity)
        ? form.entity.map((entity) => ({
            entity,
            type: form.type,
          }))
        : [{ entity: form.entity, type: form.type }]
    )
  );

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMBuiltInVariables');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    builtInVariableName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating BuiltInVariables',
      results: [],
    };
  }

  // refactor and verify
  if (toCreateBuiltInVariables.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateBuiltInVariables).map((identifier: any) => {
      const { name: builtInVariableName } = identifier;
      return {
        id: [], // No builtInVariable ID since creation did not happen
        name: builtInVariableName, // Include the builtInVariable name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create builtInVariable "${builtInVariableName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const builtInVariableNames = formData.forms.map((cd) => cd.type);

  if (toCreateBuiltInVariables.size <= availableCreateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toCreateBuiltInVariables.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateBuiltInVariables).map(
              async (identifier: any) => {
                const builtInVariableData = formData.forms.find(
                  (prop) => prop.type === identifier.type && prop.entity.includes(identifier.entity)
                );

                if (!builtInVariableData) {
                  errors.push(`Built-in variable data not found for ${identifier}`);
                  toCreateBuiltInVariables.delete(identifier);
                  return;
                }

                const [accountId, containerId, workspaceId] = identifier.entity.split('-');

                accountIdForCache = accountId;
                containerIdForCache = containerId;

                const url = new URL(
                  `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables`
                );

                const params = new URLSearchParams();
                builtInVariableData.type.forEach((type) => {
                  params.append('type', type);
                });

                const finalUrl = url + '?' + params.toString();

                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const response = await fetch(finalUrl, {
                    method: 'POST',
                    headers: headers,
                  });

                  const parsedResponse = await response.json();

                  if (response.ok) {
                    const numberOfCreatedVariables = builtInVariableData.type.length; // Get the number of created variables

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } }, // Increment by the number of created variables
                    });

                    successfulCreations.push(`${accountId}-${containerId}-${workspaceId}`); // Update with a proper identifier
                    toCreateBuiltInVariables.delete(identifier);
                    fetchGtmSettings(userId);

                    creationResults.push({
                      success: true,
                      message: `Successfully created builtInVariable ${builtInVariableData}`,
                      builtInVariableName: '',
                    });
                  } else {
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'builtInVariable',
                      [JSON.stringify(builtInVariableData)]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(identifier);
                      } else if (errorResult.errorCode === 404) {
                        const builtInVariableName =
                          builtInVariableNames.find((name) => name.includes(identifier.name)) ||
                          'Unknown';
                        notFoundLimit.push({
                          id: identifier.containerId,
                          name: Array.isArray(builtInVariableName)
                            ? builtInVariableName.join(', ')
                            : builtInVariableName,
                        });
                      }
                    } else {
                      errors.push(`An unknown error occurred for builtInVariable.`);
                    }

                    toCreateBuiltInVariables.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      builtInVariableName: identifier.name,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(`Exception creating builtInVariable: ${error.message}`);
                  toCreateBuiltInVariables.delete(identifier);
                  creationResults.push({
                    builtInVariableName: identifier.name,
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
              message: `Feature limit reached for builtInVariables: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((builtInVariableId) => {
                // Find the name associated with the builtInVariableId
                return {
                  id: [builtInVariableId], // Ensure id is an array
                  name: [builtInVariableNames], // Ensure name is an array, match by builtInVariableId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateBuiltInVariables.size === 0) {
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
          const cacheKey = `gtm:builtInVariables:userId:${userId}`;
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
      results: successfulCreations.map((builtInVariableName) => ({
        builtInVariableName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:builtInVariables:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    return {
      id: form.entity, // Ensure id is an array of strings
      name: form.type.map((type) => type.toString()), // Ensure type is a string array and each type is converted to a string
      success: true, // or false, depending on the actual result
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual builtInVariable IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Revert a single or multiple builtInVariables - Remove limits from revert. Users shouldn't be limited when reverting changes.
************************************************************************************/
export async function RevertBuiltInVariables(
  ga4BuiltInVarToRevert: Set<BuiltInVariable>
): Promise<FeatureResponse> {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const errors: string[] = [];
  const successfulDeletions: Array<{ combinedId: string; name: string }> = [];
  const featureLimitReached: Array<{ combinedId: string; name: string }> = [];
  const notFoundLimit: Array<{ combinedId: string; name: string }> = [];

  const toDeleteBuiltInVariables = new Set<BuiltInVariable>(ga4BuiltInVarToRevert);
  let accountIdForCache: string | undefined;

  // Correctly group by path
  const groupedByPath = Array.from(toDeleteBuiltInVariables).reduce((acc: any, variable: any) => {
    const { path, accountId, containerId, workspaceId, type, name } = variable.builtInVariable;

    if (!acc[path]) {
      acc[path] = {
        accountId,
        containerId,
        workspaceId,
        type: [],
        name,
      };
    }
    acc[path].type.push(type);
    return acc;
  }, {});

  const toDeleteGroupedVariables = Object.keys(groupedByPath).map((path) => {
    const { accountId, containerId, workspaceId, type, name } = groupedByPath[path];
    return {
      path,
      accountId,
      containerId,
      workspaceId,
      type,
      name,
    };
  });

  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  const containerIdsProcessed = new Set<string>();
  let permissionDenied = false;

  while (retries < MAX_RETRIES && toDeleteBuiltInVariables.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        await limiter.schedule(async () => {
          const deletePromises = Array.from(toDeleteGroupedVariables).flatMap((data) => {
            return data.type.map(async (type) => {
              accountIdForCache = data.accountId;

              const url = `https://www.googleapis.com/tagmanager/v2/${data.path}:revert?type=${type}`;

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

                const parsedResponse = await response.json();

                const combinedId = `${data.accountId}-${data.containerId}-${data.workspaceId}`;

                if (response.ok) {
                  containerIdsProcessed.add(data.containerId);
                  successfulDeletions.push({
                    combinedId: combinedId,
                    name: type,
                  });

                  toDeleteBuiltInVariables.forEach((variable: any) => {
                    if (
                      variable.builtInVariable.path === data.path &&
                      variable.builtInVariable.type === type
                    ) {
                      toDeleteBuiltInVariables.delete(variable);
                    }
                  });

                  fetchGtmSettings(userId);

                  return {
                    combinedId,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'builtInVariable',
                    [type]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        combinedId: combinedId,
                        name: type,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        combinedId: combinedId,
                        name: type,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for built-in variable ${type}.`);
                  }

                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                errors.push(`Error deleting built-in variable. ${error.message}`);
              }
              containerIdsProcessed.add(data.containerId);
              return { data, success: false };
            });
          });

          await Promise.all(deletePromises);
        });

        if (notFoundLimit.length > 0) {
          return {
            success: false,
            limitReached: false,
            notFoundError: true,
            message: `Could not revert built-in variable. Please check your permissions. All other variables were successfully reverted.`,
            results: notFoundLimit.map(({ combinedId, name }) => {
              const [accountId, containerId, workspaceId] = combinedId.split('-');
              return {
                id: [accountId, containerId, workspaceId],
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
            message: `Feature limit reached for built-in variables: ${featureLimitReached
              .map(({ combinedId }) => combinedId)
              .join(', ')}`,
            results: featureLimitReached.map(({ combinedId, name }) => {
              const [accountId, containerId, workspaceId] = combinedId.split('-');
              return {
                id: [accountId, containerId, workspaceId],
                name: [name],
                success: false,
                featureLimitReached: true,
              };
            }),
          };
        }
        if (successfulDeletions.length === toDeleteBuiltInVariables.size) {
          break;
        }
        if (permissionDenied) {
          break;
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        break;
      }
    } finally {
      const cacheKey = `gtm:builtInVariables:userId:${userId}`;
      await redis.del(cacheKey);

      await revalidatePath(`/dashboard/gtm/configurations`);
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
          id: [accountId, containerId, workspaceId],
          name: [name],
          success: true,
        };
      }),
      message: errors.join(', '),
    };
  }

  if (successfulDeletions.length > 0) {
    const specificCacheKey = `gtm:builtInVariables:userId:${userId}`;
    await redis.del(specificCacheKey);

    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedVariables = successfulDeletions.length;

  return {
    success: errors.length === 0,
    message: `Successfully reverted ${totalDeletedVariables} built-in variable(s)`,
    features: successfulDeletions.map(({ combinedId }) => combinedId),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ combinedId, name }) => {
      const [accountId, containerId, workspaceId] = combinedId.split('-');
      return {
        id: [accountId, containerId, workspaceId],
        name: [name],
        success: true,
      };
    }),
  };
}

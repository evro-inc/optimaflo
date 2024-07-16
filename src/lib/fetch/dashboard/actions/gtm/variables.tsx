'use server';
import { revalidatePath } from 'next/cache';
import { FormsSchema, TransformedFormSchema, VariableType } from '@/src/lib/schemas/gtm/variables';
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
type schema = z.infer<typeof FormsSchema>;

/************************************************************************************
  Function to list or get one GTM variables
************************************************************************************/
export async function listVariables(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:variables:userId:${userId}`;
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
            gtmData.gtm.map((data) => ({
              accountId: data.accountId,
              containerId: data.containerId,
              workspaceId: data.workspaceId,
            }))
          );

          const urls = Array.from(uniquePairs).map((props: any) => {
            const { accountId, containerId, workspaceId } = props;
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;
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

              allData.push(responseBody.variable || []);
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
  Delete a single or multiple variables
************************************************************************************/
/* export async function DeleteBuiltInVariables(
  ga4BuiltInVarToDelete: BuiltInVariable[]
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

  const toDeleteBuiltInVariables = new Set(
    ga4BuiltInVarToDelete.map(
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
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMBuiltInVariables');
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
      message: 'Feature limit reached for Deleting BuiltInVariables',
      results: [],
    };
  }

  if (toDeleteBuiltInVariables.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteBuiltInVariables.size} variables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteBuiltInVariables.size} variables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteBuiltInVariables.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteBuiltInVariables.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(ga4BuiltInVarToDelete).map(async (prop) => {
              const { accountId, containerId, workspaceId, type } = prop;
              accountIdForCache = accountId;

              let url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables?`;
              const params = new URLSearchParams();

              params.append('type', type);

              url += params.toString();

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
                    combinedId: `${accountId}-${containerId}-${workspaceId}`,
                    name: type,
                  });

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  toDeleteBuiltInVariables.delete(
                    `${accountId}-${containerId}-${workspaceId}-${type}`
                  );
                  fetchGtmSettings(userId);

                  return {
                    combinedId: `${accountId}-${containerId}-${workspaceId}-${type}`,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'variable',
                    [type]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: type,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: type,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for built-in variable ${type}.`);
                  }

                  toDeleteBuiltInVariables.delete(`${accountId}-${containerId}-${workspaceId}`);
                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(
                  `Error deleting built-in variable ${accountId}-${containerId}-${workspaceId}: ${error.message}`
                );
              }
              containerIdsProcessed.add(containerId);
              toDeleteBuiltInVariables.delete(`${accountId}-${containerId}-${workspaceId}`);
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
              message: `Could not delete built-in variable. Please check your permissions. Container Name: 
              ${notFoundLimit
                .map(({ name }) => name)
                .join(', ')}. All other variables were successfully deleted.`,
              results: notFoundLimit.map(({ combinedId, name }) => {
                const [accountId, containerId, workspaceId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, workspaceId], // Ensure id is an array
                  name: [name], // Ensure name is an array, match by variableId or default to 'Unknown'
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
                  id: [accountId, containerId, workspaceId], // Ensure id is an array
                  name: [name], // Ensure name is an array, use the name from featureLimitReached
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === ga4BuiltInVarToDelete.length) {
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
        const cacheKey = `gtm:variables:userId:${userId}`;
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
    const specificCacheKey = `gtm:variables:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedVariables = successfulDeletions.length;

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedVariables} built-in variable(s)`,
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
} */

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateVariables(formData: VariableType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData var', formData);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];
  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toCreateVariables = new Set(formData.forms.map((variable) => variable));

  console.log('toCreateVariables', toCreateVariables);

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMVariables');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    variableName: string;
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
  if (toCreateVariables.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateVariables).map((identifier: any) => {
      const { name: variableName } = identifier;
      return {
        id: [], // No variable ID since creation did not happen
        name: variableName, // Include the variable name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create variable "${variableName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateVariables.size} variables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateVariables.size} variables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const variableNames = formData.forms.map((cd) => cd.type);

  if (toCreateVariables.size <= availableCreateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toCreateVariables.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateVariables).map(async (identifier: any) => {
              console.log('identifier', identifier);

              if (!identifier) {
                errors.push(`Variable data not found for ${identifier}`);
                toCreateVariables.delete(identifier);
                return;
              }

              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${identifier.accountId}/containers/${identifier.containerId}/workspaces/${identifier.workspaceId}/variables`;

              console.log('url', url);

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [identifier] };
                const validationResult = TransformedFormSchema.safeParse(formDataToValidate);
                console.log('validationResult', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toCreateVariables.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                const validatedData = validationResult.data.forms[0];

                console.log('validatedData', validatedData);

                const response = await fetch(url.toString(), {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(validatedData),
                });

                console.log('response', response);

                const parsedResponse = await response.json();

                console.log('parsedResponse', parsedResponse);

                if (response.ok) {
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } }, // Increment by the number of created variables
                  });

                  successfulCreations.push(
                    `${validatedData.accountId}-${validatedData.containerId}-${validatedData.workspaceId}`
                  ); // Update with a proper identifier
                  toCreateVariables.delete(identifier);
                  fetchGtmSettings(userId);

                  creationResults.push({
                    success: true,
                    message: `Successfully created variable ${validatedData}`,
                    variableName: '',
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'variable',
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
                      const variableName =
                        variableNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: Array.isArray(variableName) ? variableName.join(', ') : variableName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for variable.`);
                  }

                  toCreateVariables.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    variableName: identifier.name,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating variable: ${error.message}`);
                toCreateVariables.delete(identifier);
                creationResults.push({
                  variableName: identifier.name,
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
              message: `Feature limit reached for variables: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((variableId) => {
                // Find the name associated with the variableId
                return {
                  id: [variableId], // Ensure id is an array
                  name: [variableNames], // Ensure name is an array, match by variableId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateVariables.size === 0) {
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
          const cacheKey = `gtm:variables:userId:${userId}`;
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
      results: successfulCreations.map((variableName) => ({
        variableName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:variables:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.flatMap(
    (form) =>
      form.gtmEntity?.map((entity) => ({
        id: [`${entity.accountId}-${entity.containerId}-${entity.workspaceId}`], // Wrap the unique identifier in an array
        name: [form.variables.name], // Ensure name is an array with a single string
        success: true, // or false, depending on the actual result
        notFound: false, // Set this to the appropriate value based on your logic
      })) || []
  );

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual variable IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Revert a single or multiple variables - Remove limits from revert. Users shouldn't be limited when reverting changes.
************************************************************************************/
/* export async function RevertBuiltInVariables(
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

  const groupedByPath = Array.from(toDeleteBuiltInVariables).reduce((acc, variable) => {
    if (!acc[variable.path]) {
      acc[variable.path] = {
        accountId: variable.accountId,
        containerId: variable.containerId,
        workspaceId: variable.workspaceId,
        type: [],
        name: variable.name,
      };
    }
    acc[variable.path].type.push(variable.type);
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

              let url = `https://www.googleapis.com/tagmanager/v2/${data.path}:revert?type=${type}`;

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

                  toDeleteBuiltInVariables.delete(data);
                  fetchGtmSettings(userId);

                  return {
                    combinedId,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'variable',
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

                  toDeleteBuiltInVariables.delete(data);
                  permissionDenied = errorResult ? true : permissionDenied;

                  if (toDeleteBuiltInVariables.size > 0) {
                    const firstBuiltInVariableId = toDeleteBuiltInVariables.values().next().value;
                    accountIdForCache = firstBuiltInVariableId.split('-')[0];
                  }
                }
              } catch (error: any) {
                errors.push(`Error deleting built-in variable. ${error.message}`);
              }
              containerIdsProcessed.add(data.containerId);
              toDeleteBuiltInVariables.delete(data);
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
            message: `Could not delete built-in variable. Please check your permissions. All other variables were successfully deleted.`,
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
      const cacheKey = `gtm:variables:userId:${userId}`;
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
    const specificCacheKey = `gtm:variables:userId:${userId}`;
    await redis.del(specificCacheKey);

    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedVariables = successfulDeletions.length;

  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedVariables} built-in variable(s)`,
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
} */

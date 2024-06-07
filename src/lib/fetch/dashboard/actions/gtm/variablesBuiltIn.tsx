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
import { FeatureResponse, FeatureResult } from '@/src/types/types';
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
export async function listGtmBuiltInVariables() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:builtInVariables:userId:${userId}`;
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
  selectedBuiltInVariables: Set<string>,
  builtInVariableNames: string[]
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

  const toDeleteBuiltInVariables = new Set<string>(selectedBuiltInVariables);
  let accountIdForCache: string | undefined;

  console.log("toDeleteBuiltInVariables", toDeleteBuiltInVariables);


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
        `Cannot delete ${toDeleteBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
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
            const deletePromises = Array.from(toDeleteBuiltInVariables).map(async (combinedId) => {

              console.log('combinedId', combinedId);

              const [accountId, containerId, workspaceId] = combinedId.split('-');
              accountIdForCache = accountId;

              let url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables?`;
              const params = new URLSearchParams();
              builtInVariableNames.forEach((type) => {
                params.append('type', type);
              });
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

                console.log('response', response);


                const parsedResponse = await response.json();
                console.log('Parsed Response:', parsedResponse);


                if (response.ok) {

                  builtInVariableNames.forEach(async (variableName) => {
                    console.log('variableName', variableName);

                    containerIdsProcessed.add(containerId);
                    successfulDeletions.push({
                      combinedId: `${accountId}-${containerId}-${workspaceId}`,
                      name: variableName
                    });

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { deleteUsage: { increment: 1 } },
                    });
                  });

                  toDeleteBuiltInVariables.delete(combinedId);
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
                    builtInVariableNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {


                      builtInVariableNames.forEach((variable) => {
                        featureLimitReached.push({
                          combinedId: `${accountId}-${containerId}-${workspaceId}`,
                          name: builtInVariableNames.find((name) => name.includes(variable.type)) || 'Unknown'
                        });

                      });


                    } else if (errorResult.errorCode === 404) {
                      builtInVariableNames.forEach((variable) => {
                        notFoundLimit.push({
                          combinedId: `${accountId}-${containerId}-${workspaceId}`,
                          name: builtInVariableNames.find((name) => name.includes(variable.type)) || 'Unknown'
                        });
                      });
                    }

                  } else {
                    errors.push(`An unknown error occurred for built-in variable ${builtInVariableNames}.`);
                  }

                  toDeleteBuiltInVariables.delete(
                    `${accountId}-${containerId}-${workspaceId}`
                  );
                  permissionDenied = errorResult ? true : permissionDenied;

                  if (selectedBuiltInVariables.size > 0) {
                    const firstBuiltInVariableId = selectedBuiltInVariables.values().next().value;
                    accountIdForCache = firstBuiltInVariableId.split('-')[0];
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting built-in variable ${accountId}-${containerId}-${workspaceId}: ${error.message}`);
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
              ${builtInVariableNames.find((name) =>
                name.includes(name)
              )}. All other variables were successfully deleted.`,
              results: notFoundLimit.map(({ combinedId, name }) => {
                const [accountId, containerId, workspaceId] = combinedId.split('-');
                return {
                  id: [accountId, containerId, workspaceId], // Ensure id is an array
                  name: [name], // Ensure name is an array, match by builtInVariableId or default to 'Unknown'
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
          if (successfulDeletions.length === selectedBuiltInVariables.size) {
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
        const cacheKey = `gtm:builtInVariables:userId:${userId}`;
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
      features: successfulDeletions.map(
        ({ combinedId }) => combinedId
      ),
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
    console.log('log3', accountIdForCache);

    const specificCacheKey = `gtm:builtInVariables:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedVariables = successfulDeletions.length;


  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedVariables} built-in variable(s)`,
    features: successfulDeletions.map(
      ({ combinedId }) => combinedId
    ),
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
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateBuiltInVariables(formData: FormCreateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData', formData.forms);

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
      Array.isArray(form.entity) ? form.entity.map((entity) => ({
        entity,
        type: form.type,
      })) : [{ entity: form.entity, type: form.type }]
    )
  );


  console.log('toCreateBuiltInVariables', toCreateBuiltInVariables);

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

                console.log('identifier', identifier);

                const builtInVariableData = formData.forms.find(
                  (prop) => prop.type === identifier.type && prop.entity.includes(identifier.entity)
                );

                console.log('builtInVariableData', builtInVariableData);


                if (!builtInVariableData) {
                  errors.push(`Built-in variable data not found for ${identifier}`);
                  toCreateBuiltInVariables.delete(identifier);
                  return;
                }

                const [accountId, containerId, workspaceId] = identifier.entity.split('-');

                console.log("accountId", accountId);
                console.log("containerId", containerId);
                console.log("workspaceId", workspaceId);


                accountIdForCache = accountId;
                containerIdForCache = containerId;

                const url = new URL(
                  `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables`
                );

                console.log('url call: ', url);


                const params = new URLSearchParams();
                builtInVariableData.type.forEach((type) => {
                  params.append('type', type);
                });

                console.log('params', params);



                const finalUrl = url + '?' + params.toString();

                console.log('url FINAL: ', finalUrl);

                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                console.log('headers', headers);


                try {
                  const response = await fetch(finalUrl, {
                    method: 'POST',
                    headers: headers,
                  });

                  console.log('response', response);

                  const parsedResponse = await response.json();
                  console.log('Parsed Response:', parsedResponse);

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
          console.log('log1', accountIdForCache);

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
    console.log('log2', accountIdForCache);

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
  Udpate a single container or multiple containers - Not implemented on the frontend
************************************************************************************/
export async function UpdateBuiltInVariables(formData: FormUpdateSchema) {
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
  const toUpdateBuiltInVariables = new Set(
    formData.forms.map((ws) => ({
      accountId: ws.accountId,
      containerId: ws.containerId,
      name: ws.name,
      description: ws.description,
      builtInVariableId: ws.builtInVariableId,
    }))
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMBuiltInVariables');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    builtInVariableName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating BuiltInVariables',
      results: [],
    };
  }

  if (toUpdateBuiltInVariables.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateBuiltInVariables).map((identifier) => {
      const { name: builtInVariableName } = identifier;
      return {
        id: [], // No builtInVariable ID since update did not happen
        name: builtInVariableName, // Include the builtInVariable name from the identifier
        success: false,
        message: `Update limit reached. Cannot update builtInVariable "${builtInVariableName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const builtInVariableNames = formData.forms.map((cd) => cd.name);

  if (toUpdateBuiltInVariables.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateBuiltInVariables.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateBuiltInVariables).map(async (identifier) => {
              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;
              const builtInVariableData = formData.forms.find(
                (ws) =>
                  ws.accountId === identifier.accountId &&
                  ws.containerId === identifier.containerId &&
                  ws.name === identifier.name &&
                  ws.description === identifier.description
              );

              if (!builtInVariableData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdateBuiltInVariables.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${builtInVariableData.accountId}/containers/${builtInVariableData.containerId}/builtInVariables/${builtInVariableData.builtInVariableId}`;
              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [builtInVariableData] };

                const validationResult = FormSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateBuiltInVariables.delete(identifier);
                  return {
                    builtInVariableData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated builtInVariable data
                const validatedbuiltInVariableData = validationResult.data.forms[0];
                const payload = JSON.stringify({
                  accountId: validatedbuiltInVariableData.accountId,
                  name: validatedbuiltInVariableData.name,
                  description: validatedbuiltInVariableData.description,
                  containerId: validatedbuiltInVariableData.containerId,
                  builtInVariableId: validatedbuiltInVariableData.builtInVariableId,
                });

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: payload,
                });

                let parsedResponse;
                const builtInVariableName = builtInVariableData.name;

                if (response.ok) {
                  if (response.ok) {
                    // Push a string into the array, for example, a concatenation of builtInVariableId and containerId
                    successfulUpdates.push(
                      `${validatedbuiltInVariableData.builtInVariableId}-${validatedbuiltInVariableData.containerId}`
                    );
                    // ... rest of your code
                  }
                  toUpdateBuiltInVariables.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  UpdateResults.push({
                    builtInVariableName: builtInVariableName,
                    success: true,
                    message: `Successfully updated builtInVariable ${builtInVariableName}`,
                  });
                } else {
                  parsedResponse = await response.json();

                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'builtInVariable',
                    [builtInVariableName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(builtInVariableName);
                    } else if (errorResult.errorCode === 404) {
                      const builtInVariableName =
                        builtInVariableNames.find((name) => name.includes(identifier.name)) ||
                        'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: builtInVariableName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for builtInVariable ${builtInVariableName}.`
                    );
                  }

                  toUpdateBuiltInVariables.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    builtInVariableName: builtInVariableName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception updating builtInVariable ${builtInVariableData.builtInVariableId}: ${error.message}`
                );
                toUpdateBuiltInVariables.delete(identifier);
                UpdateResults.push({
                  builtInVariableName: builtInVariableData.name,
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
              message: `Feature limit reached for builtInVariables: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((builtInVariableId) => {
                // Find the name associated with the builtInVariableId
                const builtInVariableName =
                  builtInVariableNames.find((name) => name.includes(builtInVariableId)) ||
                  'Unknown';
                return {
                  id: [builtInVariableId], // Ensure id is an array
                  name: [builtInVariableName], // Ensure name is an array, match by builtInVariableId or default to 'Unknown'
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
              message: `Feature limit reached for builtInVariables: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((builtInVariableId) => {
                // Find the name associated with the builtInVariableId
                const builtInVariableName =
                  builtInVariableNames.find((name) => name.includes(builtInVariableId)) ||
                  'Unknown';
                return {
                  id: [builtInVariableId], // Ensure id is an array
                  name: [builtInVariableName], // Ensure name is an array, match by builtInVariableId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateBuiltInVariables.size === 0) {
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
      features: successfulUpdates,
      errors: errors,
      results: successfulUpdates.map((builtInVariableName) => ({
        builtInVariableName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:builtInVariables:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.builtInVariableId is defined before adding it to the array
    const builtInVariableId = form.builtInVariableId ? [form.builtInVariableId] : []; // Provide an empty array as a fallback
    return {
      id: builtInVariableId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual builtInVariable IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Revert a single or multiple builtInVariables - Remove limits from revert. Users shouldn't be limited when reverting changes.
************************************************************************************/
export async function RevertBuiltInVariables(
  selectedBuiltInVariables: Set<string>,
  builtInVariableNames: string[]
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

  const toDeleteBuiltInVariables = new Set<string>(selectedBuiltInVariables);
  let accountIdForCache: string | undefined;

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM

  const containerIdsProcessed = new Set<string>();
  let permissionDenied = false;

  // Retry loop for deletion requests
  while (retries < MAX_RETRIES && toDeleteBuiltInVariables.size > 0 && !permissionDenied) {
    try {
      // Enforcing rate limit
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        await limiter.schedule(async () => {
          // Creating promises for each container deletion
          const deletePromises = Array.from(toDeleteBuiltInVariables).map(async (combinedId) => {
            const [accountId, containerId, workspaceId] = combinedId.split('-');
            accountIdForCache = accountId;

            let url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables:revert?`;

            const params = new URLSearchParams();
            builtInVariableNames.forEach((type) => {
              params.append('type', type);
            });

            url += params.toString();

            console.log('url revert: ', url);


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

              console.log('response', response);


              const parsedResponse = await response.json();
              console.log('Parsed Response:', parsedResponse);


              if (response.ok) {

                builtInVariableNames.forEach(async (variableName) => {
                  containerIdsProcessed.add(containerId);
                  successfulDeletions.push({
                    combinedId: `${accountId}-${containerId}-${workspaceId}`,
                    name: variableName
                  });
                });

                toDeleteBuiltInVariables.delete(combinedId);
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
                  builtInVariableNames
                );

                if (errorResult) {
                  errors.push(`${errorResult.message}`);
                  if (
                    errorResult.errorCode === 403 &&
                    parsedResponse.message === 'Feature limit reached'
                  ) {


                    builtInVariableNames.forEach((variable) => {
                      featureLimitReached.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: builtInVariableNames.find((name) => name.includes(variable.type)) || 'Unknown'
                      });

                    });


                  } else if (errorResult.errorCode === 404) {
                    builtInVariableNames.forEach((variable) => {
                      notFoundLimit.push({
                        combinedId: `${accountId}-${containerId}-${workspaceId}`,
                        name: builtInVariableNames.find((name) => name.includes(variable.type)) || 'Unknown'
                      });
                    });
                  }

                } else {
                  errors.push(`An unknown error occurred for built-in variable ${builtInVariableNames}.`);
                }

                toDeleteBuiltInVariables.delete(
                  `${accountId}-${containerId}-${workspaceId}`
                );
                permissionDenied = errorResult ? true : permissionDenied;

                if (selectedBuiltInVariables.size > 0) {
                  const firstBuiltInVariableId = selectedBuiltInVariables.values().next().value;
                  accountIdForCache = firstBuiltInVariableId.split('-')[0];
                }
              }
            } catch (error: any) {
              // Handling exceptions during fetch
              errors.push(`Error deleting built-in variable ${accountId}-${containerId}-${workspaceId}: ${error.message}`);
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
              ${builtInVariableNames.find((name) =>
              name.includes(name)
            )}. All other variables were successfully deleted.`,
            results: notFoundLimit.map(({ combinedId, name }) => {
              const [accountId, containerId, workspaceId] = combinedId.split('-');
              return {
                id: [accountId, containerId, workspaceId], // Ensure id is an array
                name: [name], // Ensure name is an array, match by builtInVariableId or default to 'Unknown'
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
        if (successfulDeletions.length === selectedBuiltInVariables.size) {
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
      features: successfulDeletions.map(
        ({ combinedId }) => combinedId
      ),
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

    const specificCacheKey = `gtm:builtInVariables:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  const totalDeletedVariables = successfulDeletions.length;


  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${totalDeletedVariables} built-in variable(s)`,
    features: successfulDeletions.map(
      ({ combinedId }) => combinedId
    ),
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
}

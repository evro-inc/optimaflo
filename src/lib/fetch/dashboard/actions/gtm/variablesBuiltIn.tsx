'use server';
import { revalidatePath } from 'next/cache';
import {
  BuiltInVariableFormType,
  FormSchema,
  FormsSchema,
} from '@/src/lib/schemas/gtm/builtInVariables';
import z from 'zod';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { BuiltInVariable, FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  handleApiResponseError,
  softRevalidateFeatureCache,
  tierCreateLimit,
  tierDeleteLimit,
  validateFormData,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof FormsSchema>;

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

const featureType: string = 'GTMBuiltInVariables';

/************************************************************************************
  Function to list or get one GTM builtInVariables
************************************************************************************/
export async function listGtmBuiltInVariables(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:builtInVariables:userId:${userId}`;

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

  await ensureGARateLimit(userId);

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
          containerId: item.containerId,
          workspaceId: item.workspaceId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  const urls = uniqueItems.map(
    ({ accountId, containerId, workspaceId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables`
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
    const ws = cleanedData.flatMap((item) => item.builtInVariable || []); // Flatten to get all workspaces directly

    try {
      const pipeline = redis.pipeline();

      ws.forEach((w: any) => {
        const fieldKey = w.accountId + '/' + w.containerId + '/' + w.workspaceId + '/' + w.type;

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(w));
        } else {
          console.warn('Skipping property with undefined name:', w);
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
  Delete a single or multiple builtInVariables
************************************************************************************/
export async function deleteBuiltInVariables(
  selected: Set<BuiltInVariable>,
  names: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'delete'
  );

  if (tierLimitResponse.limitReached || selected.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [
        `Cannot delete more built-in variables than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: BuiltInVariable[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data: BuiltInVariable) => {
      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/workspaces/${data.workspaceId}/built_in_variables?type=${data.type}`;

      console.log('data type', data);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'builtInVariables', names);
        successfulDeletions.push(data);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.name);
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Deletions**:
  if (successfulDeletions.length > 0) {
    try {
      // Explicitly type the operations array
      const operations = successfulDeletions.map((deletion) => ({
        crudType: 'delete' as const, // Explicitly set the type as "delete"
        ...deletion,
      }));
      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}/${del.type}`
      );

      await softRevalidateFeatureCache(
        [`gtm:builtInVariables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Handling responses for various scenarios like feature limit reached or not found errors
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not delete built-in variable. Please check your permissions. Built-in variable : ${names.find(
        (name) => name.includes(name)
      )}. All other built-in variables were successfully deleted.`,
      results: notFoundLimit.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
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
      message: `Feature limit reached for built-in variable: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
        success: false,
        featureLimitReached: true,
      })),
    };
  }

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
    message: `Successfully deleted ${successfulDeletions.length} built-in variable(s)`,
    features: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function createBuiltInVariables(formData: {
  forms: BuiltInVariableFormType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'create'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot create more built in variables than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const builtInVariableData: any = formData.forms.find((form) => {
        // Check if `type` in form matches the validatedData type
        const hasMatchingType = form.type.some((t) => validatedData.forms[0].type.includes(t));

        // Check if any accountContainerWorkspace in form matches the validatedData
        const hasMatchingWorkspace = form.accountContainerWorkspace.some(
          (workspace) =>
            workspace.accountId === validatedData.forms[0].accountContainerWorkspace[0].accountId &&
            workspace.containerId ===
              validatedData.forms[0].accountContainerWorkspace[0].containerId &&
            workspace.workspaceId ===
              validatedData.forms[0].accountContainerWorkspace[0].workspaceId
        );

        return hasMatchingType && hasMatchingWorkspace;
      });

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${validatedData.forms[0].accountContainerWorkspace[0].accountId}/containers/${validatedData.forms[0].accountContainerWorkspace[0].containerId}/workspaces/${validatedData.forms[0].accountContainerWorkspace[0].workspaceId}/built_in_variables`;

      const params = new URLSearchParams();
      builtInVariableData.type.forEach((type) => {
        params.append('type', type);
      });

      const finalUrl = url + '?' + params.toString();

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const res = await executeApiRequest(finalUrl, {
          method: 'POST',
          headers,
        });

        // Add the created property to successful creations
        successfulCreations.push(res);

        // Update the usage limit
        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(validatedData.name ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({
            id: validatedData.containerId ?? 'Unknown',
            name: validatedData.name ?? 'Unknown',
          });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successfulCreations.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successfulCreations.map((creation) => ({
        crudType: 'create' as const, // Explicitly set the type as "create"
        ...creation,
      }));
      const cacheFields = successfulCreations.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}/${del.type}`
      );

      await softRevalidateFeatureCache(
        [`gtm:builtInVariables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
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
      message: `Some built-in variables could not be found: ${notFoundLimit
        .map((item) => item.name)
        .join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [],
        name: [item.name],
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
      message: `Feature limit reached for built-in variables: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((propertyName) => ({
        id: [],
        name: [propertyName],
        success: false,
        featureLimitReached: true,
      })),
    };
  }

  // Proceed with general error handling if needed
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
    message: `Successfully created ${successfulCreations.length} built-in variable(s)`,
    features: successfulCreations.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulCreations.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

/* export async function  createBuiltInVariables(formData: FormCreateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  // Refactor: Use string identifiers in the set
  const to createBuiltInVariables = new Set(
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
  if (to createBuiltInVariables.size > availableCreateUsage) {
    const attemptedCreations = Array.from(to createBuiltInVariables).map((identifier: any) => {
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
      message: `Cannot create ${to createBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${to createBuiltInVariables.size} builtInVariables as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const builtInVariableNames = formData.forms.map((cd) => cd.type);

  if (to createBuiltInVariables.size <= availableCreateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && to createBuiltInVariables.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(to createBuiltInVariables).map(
              async (identifier: any) => {
                const builtInVariableData = formData.forms.find(
                  (prop) => prop.type === identifier.type && prop.entity.includes(identifier.entity)
                );

                if (!builtInVariableData) {
                  errors.push(`Built-in variable data not found for ${identifier}`);
                  to createBuiltInVariables.delete(identifier);
                  return;
                }

                const [accountId, containerId, workspaceId] = identifier.entity.split('-');

                const url = new URL(
                  `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/built_in_variables`
                );

                const params = new URLSearchParams();
                builtInVariableData.type.forEach((type) => {
                  params.append('type', type);
                });

                const finalUrl = url + '?' + params.toString();

                const headers = {
                  Authorization: `Bearer ${token}`,
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
                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } }, // Increment by the number of created variables
                    });

                    successfulCreations.push(`${accountId}-${containerId}-${workspaceId}`); // Update with a proper identifier
                    to createBuiltInVariables.delete(identifier);
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

                    to createBuiltInVariables.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      builtInVariableName: identifier.name,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(`Exception creating builtInVariable: ${error.message}`);
                  to createBuiltInVariables.delete(identifier);
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

          if (to createBuiltInVariables.size === 0) {
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
        if (userId) {
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

  if (successfulCreations.length > 0) {
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
} */

/************************************************************************************
  Revert a single or multiple builtInVariables - Remove limits from revert. Users shouldn't be limited when reverting changes.
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

  const todeleteBuiltInVariables = new Set<BuiltInVariable>(ga4BuiltInVarToRevert);

  // Correctly group by path
  const groupedByPath = Array.from(todeleteBuiltInVariables).reduce((acc: any, variable: any) => {
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

  while (retries < MAX_RETRIES && todeleteBuiltInVariables.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        await limiter.schedule(async () => {
          const deletePromises = Array.from(toDeleteGroupedVariables).flatMap((data) => {
            return data.type.map(async (type) => {
              const url = `https://www.googleapis.com/tagmanager/v2/${data.path}:revert?type=${type}`;

              const headers = {
                Authorization: `Bearer ${token}`,
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

                  todeleteBuiltInVariables.forEach((variable: any) => {
                    if (
                      variable.builtInVariable.path === data.path &&
                      variable.builtInVariable.type === type
                    ) {
                      todeleteBuiltInVariables.delete(variable);
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
        if (successfulDeletions.length === todeleteBuiltInVariables.size) {
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
} */

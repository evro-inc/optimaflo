'use server';
import { revalidatePath } from 'next/cache';
import { FormSchema, FormsSchema, TagSchema, TagType } from '@/src/lib/schemas/gtm/tags';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult, Tag } from '@/src/types/types';
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
  tierUpdateLimit,
  validateFormData,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';
import { z } from 'zod';

const featureType: string = 'GTMTags';

/************************************************************************************
  Function to list or get one GTM tags
************************************************************************************/
export async function listTags(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:tags:userId:${userId}`;

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
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`
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
    const ws = cleanedData.flatMap((item) => item.tag || []); // Flatten to get all workspaces directly

    try {
      const pipeline = redis.pipeline();
      const workspaceTagsMap = new Map();
      ws.forEach((w) => {
        const fieldKey = `${w.accountId}/${w.containerId}/${w.workspaceId}/${w.tagId}`;

        if (!workspaceTagsMap.has(fieldKey)) {
          workspaceTagsMap.set(fieldKey, []);
        }

        // Add the current tag to the corresponding workspace's list
        workspaceTagsMap.get(fieldKey).push(w);
      });

      workspaceTagsMap.forEach((tags, fieldKey) => {
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(tags));
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
/* export async function listTags(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 20;
  let delay = 2000;

  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const cacheKey = `gtm:tags:userId:${userId}`;
  if (skipCache == false) {
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
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;
          });

          const headers = {
            Authorization: `Bearer ${token}`,
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

              allData.push(responseBody.tag || []);
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
 */
/************************************************************************************
  Delete a single or multiple tags
************************************************************************************/
export async function deleteTags(
  selected: Set<z.infer<typeof TagSchema>>,
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
        `Cannot delete more built-in tags than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: z.infer<typeof TagSchema>[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data) => {
      const url = `https://www.googleapis.com/tagmanager/v2/${data.path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'tags', names);
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
        data: { ...deletion },
      }));
      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}/${del.tagId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:tags:userId:${userId}`],
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
      message: `Could not delete tag. Please check your permissions. Tag : ${names.find((name) =>
        name.includes(name)
      )}. All other tags were successfully deleted.`,
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
      message: `Feature limit reached for tag: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length} tag(s)`,
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
export async function createTags(formData: { forms: TagType['forms'] }): Promise<FeatureResponse> {
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
        `Cannot create more tags than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successful: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  // Loop over each form and each accountContainerWorkspace combination
  await Promise.all(
    formData.forms.map(async (form) => {
      for (const workspaceData of form.accountContainerWorkspace) {
        try {
          const validatedData = await validateFormData(FormSchema, { forms: [form] });
          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}/tags`;

          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Prepare body to match the required structure
          const requestBody = {
            ...validatedData.forms[0],
            accountId: workspaceData.accountId,
            containerId: workspaceData.containerId,
            workspaceId: workspaceData.workspaceId,
          };

          // Execute API request
          const res = await executeApiRequest(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          // Add the created property to successful creations
          successful.push(res);

          // Update the usage limit
          await prisma.tierLimit.update({
            where: { id: tierLimitResponse.id },
            data: { createUsage: { increment: 1 } },
          });
        } catch (error: any) {
          if (error.message === 'Feature limit reached') {
            featureLimitReached.push(form.name ?? 'Unknown');
          } else if (error.message.includes('404')) {
            notFoundLimit.push({
              id: workspaceData.containerId ?? 'Unknown',
              name: form.name ?? 'Unknown',
            });
          } else {
            errors.push(error.message);
          }
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successful.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successful.map((creation) => ({
        crudType: 'create' as const, // Explicitly set the type as "create"
        data: { ...creation }, // Put all remaining fields into data
      }));

      const cacheFields = successful.map(
        ({ accountId, containerId, workspaceId, tagId }) =>
          `${accountId}/${containerId}/${workspaceId}/${tagId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:tags:userId:${userId}`],
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
      message: `Some tags could not be found: ${notFoundLimit.map((item) => item.name).join(', ')}`,
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
      message: `Feature limit reached for tags: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully created ${successful.length} tag(s)`,
    features: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

/* export async function CreateTags(formData: TagType) {
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
  const toCreateTags = new Set(formData.forms.map((tag) => tag));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMTags');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    tagName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Tags',
      results: [],
    };
  }

  // refactor and verify
  if (toCreateTags.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateTags).map((identifier: any) => {
      const { name: tagName } = identifier;

      return {
        id: [], // No tag ID since creation did not happen
        name: tagName, // Include the tag name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create tag "${tagName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateTags.size} tags as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateTags.size} tags as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const tagNames = formData.forms.map((cd) => cd.type);

  if (toCreateTags.size <= availableCreateUsage) {
    // Initialize retries tag to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toCreateTags.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateTags).map(async (identifier: any) => {
              if (!identifier) {
                errors.push(`Tag data not found for ${identifier}`);
                toCreateTags.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${identifier.accountId}/containers/${identifier.containerId}/workspaces/${identifier.workspaceId}/tags`;

              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [identifier] };

                const validationResult = FormsSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toCreateTags.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                const validatedData = validationResult.data.forms[0];

                const response = await fetch(url.toString(), {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(validatedData),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } }, // Increment by the number of created tags
                  });

                  successfulCreations.push(
                    `${validatedData.accountId}-${validatedData.containerId}-${validatedData.workspaceId}`
                  ); // Update with a proper identifier
                  toCreateTags.delete(identifier);
                  fetchGtmSettings(userId);

                  creationResults.push({
                    success: true,
                    message: `Successfully created tag ${validatedData}`,
                    tagName: '',
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'tag',
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
                      const tagName =
                        tagNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: Array.isArray(tagName) ? tagName.join(', ') : tagName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for tag.`);
                  }

                  toCreateTags.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    tagName: identifier.name,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating tag: ${error.message}`);
                toCreateTags.delete(identifier);
                creationResults.push({
                  tagName: identifier.name,
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
              message: `Feature limit reached for tags: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((tagId) => {
                // Find the name associated with the tagId
                return {
                  id: [tagId], // Ensure id is an array
                  name: [tagNames], // Ensure name is an array, match by tagId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateTags.size === 0) {
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
          const cacheKey = `gtm:tags:userId:${userId}`;
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
      results: successfulCreations.map((tagName) => ({
        tagName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `gtm:tags:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.flatMap(
    (form) =>
      form.gtmEntity?.map((entity) => ({
        id: [`${entity.accountId}-${entity.containerId}-${entity.workspaceId}`], // Wrap the unique identifier in an array
        name: [form.tags.name], // Ensure name is an array with a single string
        success: true, // or false, depending on the actual result
        notFound: false, // Set this to the appropriate value based on your logic
      })) || []
  );

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual tag IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
} */

/************************************************************************************
  Update a single or multiple tags
************************************************************************************/
export async function updateTags(formData: { forms: TagType['forms'] }): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'update'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot update more tags than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successful: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  // Loop over each form and each accountContainerWorkspace combination
  await Promise.all(
    formData.forms.map(async (form) => {
      for (const workspaceData of form.accountContainerWorkspace) {
        try {
          const validatedData = await validateFormData(FormSchema, { forms: [form] });

          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}/tags/${workspaceData.tagId}`;

          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Prepare body to match the required structure
          const requestBody = {
            ...validatedData.forms[0],
            accountId: workspaceData.accountId,
            containerId: workspaceData.containerId,
            workspaceId: workspaceData.workspaceId,
          };

          // Execute API request
          const res = await executeApiRequest(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody),
          });

          // Add the created property to successful creations
          successful.push(res);

          // Update the usage limit
          await prisma.tierLimit.update({
            where: { id: tierLimitResponse.id },
            data: { updateUsage: { increment: 1 } },
          });
        } catch (error: any) {
          if (error.message === 'Feature limit reached') {
            featureLimitReached.push(form.name ?? 'Unknown');
          } else if (error.message.includes('404')) {
            notFoundLimit.push({
              id: workspaceData.containerId ?? 'Unknown',
              name: form.name ?? 'Unknown',
            });
          } else {
            errors.push(error.message);
          }
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successful.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successful.map((update) => ({
        crudType: 'update' as const, // Explicitly set the type as "create"
        data: { ...update },
      }));

      const cacheFields = successful.map(
        (c) => `${c.accountId}/${c.containerId}/${c.workspaceId}/${c.tagId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:tags:userId:${userId}`],
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
      message: `Some tags could not be found: ${notFoundLimit.map((item) => item.name).join(', ')}`,
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
      message: `Feature limit reached for tags: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successful.length} tag(s)`,
    features: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

/* export async function UpdateTags(formData: TagType) {
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
  const toUpdateTags = new Set(formData.forms.map((tag) => tag));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMTags');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const updateResults: {
    tagName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating tags',
      results: [],
    };
  }

  // refactor and verify
  if (toUpdateTags.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateTags).map((identifier: any) => {
      const { name: tagName } = identifier;
      return {
        id: [], // No tag ID since creation did not happen
        name: tagName, // Include the tag name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update tag "${tagName}".`,
        // remaining creation limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateTags.size} tags as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      errors: [
        `Cannot update ${toUpdateTags.size} tags as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  // Corrected property name to 'name' based on the lint context provided
  const tagNames = formData.forms.map((t) => t.type);

  if (toUpdateTags.size <= availableUpdateUsage) {
    // Initialize retries tag to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toUpdateTags.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateTags).map(async (identifier: any) => {
              if (!identifier) {
                errors.push(`Tag data not found for ${identifier}`);
                toUpdateTags.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${identifier.accountId}/containers/${identifier.containerId}/workspaces/${identifier.workspaceId}/tags/${identifier.tagId}`;

              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [identifier] };
                const validationResult = FormsSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateTags.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                const validatedData = validationResult.data.forms[0];

                const response = await fetch(url.toString(), {
                  method: 'PUT',
                  headers: headers,
                  body: JSON.stringify(validatedData),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } }, // Increment by the number of updated tags
                  });

                  successfulCreations.push(
                    `${validatedData.accountId}-${validatedData.containerId}-${validatedData.workspaceId}`
                  ); // Update with a proper identifier
                  toUpdateTags.delete(identifier);
                  fetchGtmSettings(userId);

                  updateResults.push({
                    success: true,
                    message: `Successfully updated tag ${validatedData}`,
                    tagName: '',
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'tag',
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
                      const tagName =
                        tagNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: Array.isArray(tagName) ? tagName.join(', ') : tagName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for tag.`);
                  }

                  toUpdateTags.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  updateResults.push({
                    tagName: identifier.name,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating tag: ${error.message}`);
                toUpdateTags.delete(identifier);
                updateResults.push({
                  tagName: identifier.name,
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
              message: `Feature limit reached for tags: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((tagId) => {
                // Find the name associated with the tagId
                return {
                  id: [tagId], // Ensure id is an array
                  name: [tagNames], // Ensure name is an array, match by tagId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toUpdateTags.size === 0) {
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
          const cacheKey = `gtm:tags:userId:${userId}`;
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
      results: successfulCreations.map((tagName) => ({
        tagName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `gtm:tags:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/configurations`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.flatMap(
    (form) =>
      form.gtmEntity?.map((entity) => ({
        id: [`${entity.accountId}-${entity.containerId}-${entity.workspaceId}`], // Wrap the unique identifier in an array
        name: [form.tags.name], // Ensure name is an array with a single string
        success: true, // or false, depending on the actual result
        notFound: false, // Set this to the appropriate value based on your logic
      })) || []
  );

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual tag IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
} */

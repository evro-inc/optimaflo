'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateContainerSchema,
  UpdateContainerSchema,
} from '@/src/lib/schemas/gtm/containers';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { gaRateLimit, gtmRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse } from '@/src/lib/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';
import { fetchGASettings, fetchGtmSettings } from '../..';
import { CreatePropertySchema } from '@/src/lib/schemas/ga/properties';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreatePropertySchema>;

/************************************************************************************
  Function to list GA properties
************************************************************************************/
export async function listGAProperties() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const gaData = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ga: true,
    },
  });

  const cacheKey = `ga:properties:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gaRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniqueAccountIds = Array.from(
            new Set(gaData.ga.map((item) => item.accountId))
          );

          const urls = uniqueAccountIds.map(
            (accountId) =>
              `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountId}`
          );

          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          for (const url of urls) {
            try {
              const response = await fetch(url, { headers });
              if (!response.ok) {
                throw new Error(
                  `HTTP error! status: ${response.status}. ${response.statusText}`
                );
              }

              const responseBody = await response.json();

              allData.push(responseBody.properties || []);
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

        redis.set(cacheKey, JSON.stringify(allData.flat()));

        return allData.flat();
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
  Delete a single or multiple containers
************************************************************************************/
export async function DeleteContainers(
  selectedContainers: Set<string>,
  containerNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: string[] = [];
  const toDeleteContainers = new Set(selectedContainers);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMContainer');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Containers',
      results: [],
    };
  }

  if (toDeleteContainers.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteContainers.size} containers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteContainers.size} containers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteContainers.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (
      retries < MAX_RETRIES &&
      toDeleteContainers.size > 0 &&
      !permissionDenied
    ) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(toDeleteContainers).map(
              async (combinedId) => {
                const [accountId, containerId] = combinedId.split('-');

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;
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

                  let parsedResponse;

                  if (response.ok) {
                    successfulDeletions.push(containerId);
                    toDeleteContainers.delete(containerId);

                    await prisma.gtm.deleteMany({
                      where: {
                        accountId: accountId,
                        containerId: containerId,
                        userId: userId, // Ensure this matches the user ID
                      },
                    });

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { deleteUsage: { increment: 1 } },
                    });

                    return { containerId, success: true };
                  } else {
                    parsedResponse = await response.json();
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'container',
                      containerNames
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(containerId);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push(containerId); // Track 404 errors
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for container ${containerNames}.`
                      );
                    }

                    toDeleteContainers.delete(containerId);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                } catch (error: any) {
                  // Handling exceptions during fetch
                  errors.push(
                    `Error deleting container ${containerId}: ${error.message}`
                  );
                }
                toDeleteContainers.delete(containerId);
                return { containerId, success: false };
              }
            );

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete container. Please check your permissions. Container Name: 
              ${containerNames.find((name) =>
                name.includes(name)
              )}. All other containers were successfully deleted.`,
              results: notFoundLimit.map((containerId) => ({
                id: [containerId], // Ensure id is an array
                name: [
                  containerNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by containerId or default to 'Unknown'
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
              message: `Feature limit reached for containers: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((containerId) => ({
                id: [containerId], // Ensure id is an array
                name: [
                  containerNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by containerId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedContainers.size) {
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
        // This block will run regardless of the outcome of the try...catch
        if (userId) {
          // Invalidate cache for all accounts if containers belong to multiple accounts
          // Otherwise, just invalidate cache for the single account
          const cacheKey = `gtm:containers:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/containers`);
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
      features: successfulDeletions,
      errors: errors,
      results: successfulDeletions.map((containerId) => ({
        id: [containerId], // Ensure id is an array
        name: [containerNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    const cacheKey = `gtm:containers:userId:${userId}`;

    // Update the Redis cache
    await redis.del(cacheKey);
    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/containers`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} container(s)`,
    features: successfulDeletions,
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map((containerId) => ({
      id: [containerId], // Ensure id is an array
      name: [containerNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function createProperties(formData: FormCreateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  // Refactor: Use string identifiers in the set
  const toCreateProperties = new Set(
    formData.forms.map((cd) => `${cd.accountId}-${cd.propertyName}`)
  );

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4Properties');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    propertyName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Properties',
      results: [],
    };
  }

  if (toCreateProperties.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateProperties).map(
      (identifier) => {
        const [propertyName] = identifier.split('-');
        return {
          id: [], // No property ID since creation did not happen
          name: propertyName, // Include the property name from the identifier
          success: false,
          message: `Creation limit reached. Cannot create property "${propertyName}".`,
          // remaining creation limit
          remaining: availableCreateUsage,
          limitReached: true,
        };
      }
    );
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateProperties.size} properties as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateProperties.size} properties as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const propertyNames = formData.forms.map((cd) => cd.displayName);

  if (toCreateProperties.size <= availableCreateUsage) {
    while (
      retries < MAX_RETRIES &&
      toCreateProperties.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateProperties).map(
              async (identifier) => {
                const [accountId, propertyName] = identifier.split('-');
                const propertyData = formData.forms.find(
                  (cd) =>
                    cd.accountId === accountId &&
                    cd.displayName === propertyName
                );
                console.log('propertyData', propertyData);
                

                if (!propertyData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toCreateProperties.delete(identifier);
                  return;
                }

                const url = `https://analyticsadmin.googleapis.com/v1beta/properties`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [propertyData] };

                  console.log('formDataToValidate', formDataToValidate);
                  

                  const validationResult =
                    CreateContainerSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toCreateProperties.delete(identifier);
                    return {
                      propertyData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated property data
                  const validatedContainerData = validationResult.data.forms[0];

                  const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                      displayName: validatedContainerData.displayName,
                      timeZone: validatedContainerData.timeZone,
                      industryCategory: validatedContainerData.industryCategory,
                      currencyCode: validatedContainerData.currencyCode,
                    }),
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulCreations.push(propertyName);
                    toCreateProperties.delete(identifier);
                    fetchGtmSettings(userId);
                    fetchGASettings(userId);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } },
                    });
                    creationResults.push({
                      propertyName: propertyName,
                      success: true,
                      message: `Successfully created property ${propertyName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'property',
                      [propertyName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(propertyName);
                      } else if (errorResult.errorCode === 404) {
                        const propertyName =
                          propertyNames.find((name) =>
                            name.includes(identifier.split('-')[1])
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.split('-')[1],
                          name: propertyName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for property ${propertyName}.`
                      );
                    }

                    toCreateProperties.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      propertyName: propertyName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating property ${propertyName}: ${error.message}`
                  );
                  toCreateProperties.delete(identifier);
                  creationResults.push({
                    propertyName: propertyName,
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
              message: `Feature limit reached for properties: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((propertyId) => {
                // Find the name associated with the propertyId
                const propertyName =
                  propertyNames.find((name) => name.includes(propertyId)) ||
                  'Unknown';
                return {
                  id: [propertyId], // Ensure id is an array
                  name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateProperties.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay + Math.random() * 200)
          );
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (userId) {
          const cacheKey = `ga:properties:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/ga/properties`);
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
      results: successfulCreations.map((propertyName) => ({
        propertyName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:properties:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const propertyId = form.propertyId ? [form.propertyId] : []; // Provide an empty array as a fallback
    return {
      id: propertyId, // Ensure id is an array of strings
      name: [form.propertyName], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual property IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Properties created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function UpdateContainers(formData: FormCreateSchema) {
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

  let accountIdsForCache = new Set<string>();

  // Refactor: Use string identifiers in the set
  const toUpdateContainers = new Set(
    formData.forms.map((cd) => `${cd.accountId}-${cd.containerName}`)
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMContainer');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    containerName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Updating Containers',
      results: [],
    };
  }

  if (toUpdateContainers.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateContainers).map(
      (identifier) => {
        const [containerName] = identifier.split('-');
        return {
          id: [], // No container ID since update did not happen
          name: containerName, // Include the container name from the identifier
          success: false,
          message: `Update limit reached. Cannot update container "${containerName}".`,
          // remaining update limit
          remaining: availableUpdateUsage,
          limitReached: true,
        };
      }
    );
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateContainers.size} containers as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateContainers.size} containers as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const containerNames = formData.forms.map((cd) => cd.containerName);

  if (toUpdateContainers.size <= availableUpdateUsage) {
    while (
      retries < MAX_RETRIES &&
      toUpdateContainers.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateContainers).map(
              async (identifier) => {
                const [accountId, containerName] = identifier.split('-');
                accountIdsForCache.add(accountId);
                const containerData = formData.forms.find(
                  (cd) =>
                    cd.accountId === accountId &&
                    cd.containerName === containerName
                );

                if (!containerData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toUpdateContainers.delete(identifier);
                  return;
                }

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerData.containerId}`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                  'Accept-Encoding': 'gzip',
                };

                try {
                  const formDataToValidate = { forms: [containerData] };

                  const validationResult =
                    UpdateContainerSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toUpdateContainers.delete(identifier);
                    return {
                      containerData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated container data
                  const validatedContainerData = validationResult.data.forms[0];

                  const response = await fetch(url, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify({
                      accountId: accountId,
                      name: containerName,
                      usageContext: validatedContainerData.usageContext,
                      domainName: validatedContainerData.domainName,
                      notes: validatedContainerData.notes,
                    }),
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulUpdates.push(containerName);
                    toUpdateContainers.delete(identifier);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { updateUsage: { increment: 1 } },
                    });

                    UpdateResults.push({
                      containerName: containerName,
                      success: true,
                      message: `Successfully updated container ${containerName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'container',
                      [containerName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(containerName);
                      } else if (errorResult.errorCode === 404) {
                        const containerName =
                          containerNames.find((name) =>
                            name.includes(identifier.split('-')[1])
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.split('-')[1],
                          name: containerName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for container ${containerName}.`
                      );
                    }

                    toUpdateContainers.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    UpdateResults.push({
                      containerName: containerName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception updating container ${containerName}: ${error.message}`
                  );
                  toUpdateContainers.delete(identifier);
                  UpdateResults.push({
                    containerName: containerName,
                    success: false,
                    message: error.message,
                  });
                }
              }
            );

            await Promise.all(updatePromises);
          });

          const cacheKey = `gtm:containers:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/containers`);

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
              message: `Feature limit reached for containers: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map((containerId) => {
                // Find the name associated with the containerId
                const containerName =
                  containerNames.find((name) => name.includes(containerId)) ||
                  'Unknown';
                return {
                  id: [containerId], // Ensure id is an array
                  name: [containerName], // Ensure name is an array, match by containerId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateContainers.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay + Math.random() * 200)
          );
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (accountIdsForCache && userId) {
          await redis.del(
            `gtm:containers:accountId:${accountIdsForCache}:userId:${userId}`
          );
          await revalidatePath(`/dashboard/gtm/containers`);
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
      results: successfulUpdates.map((containerName) => ({
        containerName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0) {
    await redis.del(
      `gtm:containers:accountId:${accountIdsForCache}:userId:${userId}`
    );
    revalidatePath(`/dashboard/gtm/containers`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.containerId is defined before adding it to the array
    const containerId = form.containerId ? [form.containerId] : []; // Provide an empty array as a fallback
    return {
      id: containerId, // Ensure id is an array of strings
      name: [form.containerName], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual container IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

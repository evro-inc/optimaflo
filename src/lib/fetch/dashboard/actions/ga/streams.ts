'use server';
import { revalidatePath } from 'next/cache';
import z from 'zod';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GA4StreamType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { DataStreamType, FormsSchema } from '@/src/lib/schemas/ga/streams';

/************************************************************************************
  Function to list GA streams
************************************************************************************/
export async function listGAPropertyStreams() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);


  const cacheKey = `ga:streams:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  await fetchGASettings(userId);

  const gaData = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    include: {
      ga: true,
    },
  });

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        let allData: any[] = [];

        await limiter.schedule(async () => {
          const uniquePropertyIds = Array.from(new Set(gaData.ga.map((item) => item.propertyId)));

          const urls = uniquePropertyIds.map(
            (propertyId) =>
              `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`
          );

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
              allData.push(responseBody);

              // Removed the problematic line here
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
  Create a single property or multiple streams
************************************************************************************/
export async function createGAPropertyStreams(formData: DataStreamType) {
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
  const toCreateStreams = new Set(formData.forms.map((cd) => cd));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4Streams');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    streamName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Streams',
      results: [],
    };
  }

  if (toCreateStreams.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateStreams).map((identifier) => {
      const displayName = identifier.displayName;
      return {
        id: [], // No property ID since creation did not happen
        name: displayName, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create stream "${displayName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateStreams.size} streams as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateStreams.size} streams as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const streamNames = formData.forms.map((cd) => cd.displayName);

  if (toCreateStreams.size <= availableCreateUsage) {
    while (retries < MAX_RETRIES && toCreateStreams.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateStreams).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Stream data not found for ${identifier}`);
                toCreateStreams.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.property}/dataStreams`;

              const headers = {
                Authorization: `Bearer ${token.data[0].token}`,
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
                  toCreateStreams.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  displayName: validatedContainerData.displayName,
                  type: validatedContainerData.type,
                };

                // Dynamically add the specific stream data based on the type
                switch (validatedContainerData.type) {
                  case 'WEB_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      webStreamData: {
                        defaultUri: validatedContainerData?.webStreamData?.defaultUri,
                      },
                    };
                    break;
                  case 'ANDROID_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      androidAppStreamData: {
                        packageName: validatedContainerData?.androidAppStreamData?.packageName,
                      },
                    };
                    break;
                  case 'IOS_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      iosAppStreamData: {
                        bundleId: validatedContainerData?.iosAppStreamData?.bundleId,
                      },
                    };
                    break;
                  // You can add more cases here if there are other types
                  default:
                    // Handle unexpected type or throw an error
                    throw new Error('Unsupported stream type');
                }

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.displayName);
                  toCreateStreams.delete(identifier);
                  fetchGASettings(userId);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    streamName: validatedContainerData.displayName,
                    success: true,
                    message: `Successfully created property ${validatedContainerData.displayName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'property',
                    [validatedContainerData.displayName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.displayName);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedContainerData.displayName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.displayName}.`
                    );
                  }

                  toCreateStreams.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    streamName: validatedContainerData.displayName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating property ${identifier.displayName}: ${error.message}`
                );
                toCreateStreams.delete(identifier);
                creationResults.push({
                  streamName: identifier.displayName,
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
              message: `Feature limit reached for streams: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((displayName) => {
                // Find the name associated with the propertyId
                const streamName =
                  streamNames.find((displayName) => displayName.includes(displayName)) || 'Unknown';
                return {
                  id: [streamName], // Ensure id is an array
                  name: [streamName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateStreams.size === 0) {
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
          const cacheKey = `ga:streams:userId:${userId}`;
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
      results: successfulCreations.map((streamName) => ({
        streamName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:streams:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const streamId = form.displayName ? [form.displayName] : []; // Provide an empty array as a fallback
    return {
      id: streamId, // Ensure id is an array of strings
      name: [form.displayName], // Wrap the string in an array
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
    message: 'Streams created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Update a single property or multiple streams
************************************************************************************/
export async function updateGAPropertyStreams(formData: DataStreamType) {
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
  const toUpdateStreams = new Set(formData.forms.map((cd) => cd));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4Streams');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const creationResults: {
    streamName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Streams',
      results: [],
    };
  }

  if (toUpdateStreams.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateStreams).map((identifier) => {
      const displayName = identifier.displayName;
      return {
        id: [], // No property ID since creation did not happen
        name: displayName, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update stream "${displayName}".`,
        // remaining creation limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateStreams.size} streams as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      errors: [
        `Cannot update ${toUpdateStreams.size} streams as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const streamNames = formData.forms.map((cd) => cd.displayName);

  if (toUpdateStreams.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateStreams.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateStreams).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Stream data not found for ${identifier}`);
                toUpdateStreams.delete(identifier);
                return;
              }

              let updateFields: string[] = [];

              switch (identifier.type) {
                case 'WEB_DATA_STREAM':
                  updateFields = ['displayName', 'webStreamData.defaultUri'];
                  break;
                case 'ANDROID_APP_DATA_STREAM':
                  updateFields = ['displayName', 'androidAppStreamData.packageName'];
                  break;
                case 'IOS_APP_DATA_STREAM':
                  updateFields = ['displayName', 'iosAppStreamData.bundleId'];
                  break;
              }

              const updateMask = updateFields.join(',');
              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.parentURL}?updateMask=${updateMask}`;

              const headers = {
                Authorization: `Bearer ${token.data[0].token}`,
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
                  toUpdateStreams.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  displayName: validatedContainerData.displayName,
                  type: validatedContainerData.type,
                };

                // Dynamically add the specific stream data based on the type
                switch (validatedContainerData.type) {
                  case 'WEB_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      webStreamData: {
                        defaultUri: validatedContainerData?.webStreamData?.defaultUri,
                      },
                    };
                    break;
                  case 'ANDROID_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      androidAppStreamData: {
                        packageName: validatedContainerData?.androidAppStreamData?.packageName,
                      },
                    };
                    break;
                  case 'IOS_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      iosAppStreamData: {
                        bundleId: validatedContainerData?.iosAppStreamData?.bundleId,
                      },
                    };
                    break;
                  // You can add more cases here if there are other types
                  default:
                    // Handle unexpected type or throw an error
                    throw new Error('Unsupported stream type');
                }

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'PATCH',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.displayName);
                  toUpdateStreams.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    streamName: validatedContainerData.displayName,
                    success: true,
                    message: `Successfully updated property ${validatedContainerData.displayName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'property',
                    [validatedContainerData.displayName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.displayName);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedContainerData.displayName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.displayName}.`
                    );
                  }

                  toUpdateStreams.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    streamName: validatedContainerData.displayName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating property ${identifier.displayName}: ${error.message}`
                );
                toUpdateStreams.delete(identifier);
                creationResults.push({
                  streamName: identifier.displayName,
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
              message: `Feature limit reached for streams: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((displayName) => {
                // Find the name associated with the propertyId
                const streamName =
                  streamNames.find((displayName) => displayName.includes(displayName)) || 'Unknown';
                return {
                  id: [streamName], // Ensure id is an array
                  name: [streamName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toUpdateStreams.size === 0) {
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
      results: successfulCreations.map((streamName) => ({
        streamName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:streams:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const streamId = form.displayName ? [form.displayName] : []; // Provide an empty array as a fallback
    return {
      id: streamId, // Ensure id is an array of strings
      name: [form.displayName], // Wrap the string in an array
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
    message: 'Streams updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Delete a single property or multiple streams
************************************************************************************/
export async function deleteGAPropertyStreams(
  selectedStreams: Set<GA4StreamType>,
  streamNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{
    name: string;
  }> = [];
  const featureLimitReached: { name: string }[] = [];
  const notFoundLimit: { name: string }[] = [];
  const toDeleteStreams = new Set<GA4StreamType>(selectedStreams);
  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const cacheKey = `ga:streams:userId:${userId}`;

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4Streams');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;
  const IdsProcessed = new Set<string>();

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Streams',
      results: [],
    };
  }

  if (toDeleteStreams.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteStreams.size} streams as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteStreams.size} streams as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteStreams.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteStreams.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteStreams).map(async (identifier) => {
              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.name}`;
              const headers = {
                Authorization: `Bearer ${token.data[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const response = await fetch(url, {
                  method: 'DELETE',
                  headers: headers,
                });

                const parsedResponse = await response.json();

                const cleanedParentId = identifier.parent.split('/')[1];

                if (response.ok) {
                  IdsProcessed.add(identifier.name);
                  successfulDeletions.push({
                    name: identifier.name,
                  });
                  toDeleteStreams.delete(identifier);
                  await prisma.ga.deleteMany({
                    where: {
                      accountId: `${identifier.accountId}`,
                      propertyId: cleanedParentId,
                      userId: userId, // Ensure this matches the user ID
                    },
                  });
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  return {
                    name: identifier.name,
                    displayName: identifier.displayName,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GA4Streams',
                    streamNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        name: identifier.name,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        name: identifier.name,
                      });
                    } else {
                      errors.push(`An unknown error occurred for property ${streamNames}.`);
                    }

                    toDeleteStreams.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting property ${identifier.parent}: ${error.message}`);
              }
              IdsProcessed.add(identifier.parent);
              toDeleteStreams.delete(identifier);
              return { name: identifier.parent, success: false };
            });

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete stream. Please check your permissions. Property Name: 
              ${streamNames.find((name) =>
                name.includes(name)
              )}. All other streams were successfully deleted.`,
              results: notFoundLimit.map(({ name }) => ({
                id: [name], // Combine accountId and propertyId into a single array of strings
                name: [streamNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
              message: `Feature limit reached for streams: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map(({ name }) => ({
                id: [name], // Ensure id is an array
                name: [streamNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedStreams.size) {
            break; // Exit loop if all streams are processed successfully
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
        await redis.del(cacheKey);

        await revalidatePath('/dashboard/ga/properties');
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
      features: successfulDeletions.map(({ name }) => `${name}`),
      errors: errors,
      results: successfulDeletions.map(({ name }) => ({
        id: [name], // Ensure id is an array
        name: [streamNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    await redis.del(cacheKey);
    // Revalidate paths if needed
    revalidatePath('/dashboard/ga/properties');
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} stream(s)`,
    features: successfulDeletions.map(({ name }) => `${name}`),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ name }) => ({
      id: [name], // Ensure id is an array
      name: [streamNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

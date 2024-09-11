'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GA4StreamType } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  handleApiResponseError,
  revalidate,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { DataStreamType, FormsSchema } from '@/src/lib/schemas/ga/streams';

const featureType: string = 'GA4Streams';

/************************************************************************************
  Function to list GA streams
************************************************************************************/
export async function listGAPropertyStreams(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:streams:userId:${userId}`;

  console.log('running streams pull');

  if (skipCache === false) {
    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      try {
        const parsedData = JSON.parse(cacheData);
        return parsedData;
      } catch (error) {
        console.error('Failed to parse cache data:', error);
        console.log('Cached data:', cacheData); // Log the cached data for inspection
        await redis.del(cacheKey);
      }
    }
  }

  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { ga: true },
  });

  if (!data) return [];

  await ensureGARateLimit(userId);

  const uniquePropertyIds = Array.from(new Set(data.ga.map((item) => item.propertyId)));

  const urls = uniquePropertyIds.map(
    (propertyId) =>
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`
  );

  console.log('urls', urls);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));

  console.log('allData', allData);

  // Before storing the data in Redis, ensure it is a valid JSON
  const flattenedData = allData.flat();
  try {
    const jsonData = JSON.stringify(flattenedData);
    await redis.set(cacheKey, jsonData, 'EX', 86400);
  } catch (error) {
    console.error('Failed to stringify or set cache data:', error);
  }

  return flattenedData;
}

/************************************************************************************
  Delete a single property or multiple streams
************************************************************************************/
export async function deleteGAPropertyStreams(
  selectedStreams: Set<string>,
  streamNames: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'delete'
  );

  if (tierLimitResponse.limitReached || selectedStreams.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [
        `Cannot delete more streams than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selectedStreams).map(async (data: any) => {
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${data.name}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };
      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'streams', streamNames);
        successfulDeletions.push(data.streamId);

        await prisma.ga.deleteMany({
          where: {
            accountId: `accounts/${data.accountId}`,
            propertyId: data.name,
            userId: userId, // Ensure this matches the user ID
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });

        await revalidate([`ga:streams:userId:${userId}`], `/dashboard/ga/properties`, userId).catch(
          (err) => {
            console.error('Error during revalidation:', err);
          }
        );
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.streamId);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.streamId);
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // Check for not found stream and return response if applicable
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not delete stream. Please check your permissions. Stream Name: ${streamNames.find(
        (name) => name.includes(name)
      )}. All other streams were successfully deleted.`,
      results: notFoundLimit.map((streamId) => ({
        id: [streamId], // Ensure id is an array
        name: [streamNames.find((name) => name.includes(streamId)) || 'Unknown'], // Ensure name is an array
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
      message: `Feature limit reached for streams: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((streamId) => ({
        id: [streamId], // Ensure id is an array
        name: [streamNames.find((name) => name.includes(streamId)) || 'Unknown'], // Ensure name is an array
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
    message: `Successfully deleted ${successfulDeletions.length} stream(s)`,
    features: successfulDeletions.map<FeatureResult>((streamId) => ({
      id: [streamId], // Wrap streamId in an array to match FeatureResult type
      name: [streamNames.find((name) => name.includes(streamId)) || 'Unknown'], // Wrap name in an array to match FeatureResult type
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((streamId) => ({
      id: [streamId], // FeatureResult.id is an array
      name: [streamNames.find((name) => name.includes(streamId)) || 'Unknown'], // FeatureResult.name is an array
      success: true, // FeatureResult.success indicates if the operation was successful
    })),
  };
}

/* NOT REFACTORED YET */
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
              results: featureLimitReached.map(() => {
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
              results: featureLimitReached.map(() => {
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

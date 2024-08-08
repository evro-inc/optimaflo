'use server';
import { revalidatePath } from 'next/cache';
import z from 'zod';
import { auth } from '@clerk/nextjs/server';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GA4PropertyType, GA4StreamType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { DataStreamType, FormsSchema } from '@/src/lib/schemas/ga/streams';
import { gaRateLimit } from '@/src/lib/redis/rateLimits';
import { limiter } from '@/src/lib/bottleneck';
import { fetchGASettings } from '..';

/************************************************************************************
  Function to list projects
************************************************************************************/
export async function listGCPProjects() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `ga:projects:userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const url = 'https://firebase.googleapis.com/v1beta1/availableProjects';

          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
            }

            const responseBody = await response.json();
            const projects = responseBody['projectInfo'];

            for (let i in projects) {
              const project = projects[i];
            }

            /* redis.set(cacheKey, JSON.stringify(projects), 'EX', 3600);

                return projects; */

            // Removed the problematic line here
          } catch (error: any) {
            throw new Error(`Error fetching data: ${error.message}`);
          }
        });
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
                Authorization: `Bearer ${token[0].token}`,
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
                        defaultUri: validatedContainerData.webStreamData.defaultUri,
                      },
                    };
                    break;
                  case 'ANDROID_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      androidAppStreamData: {
                        packageName: validatedContainerData.androidAppStreamData.packageName,
                      },
                    };
                    break;
                  case 'IOS_APP_DATA_STREAM':
                    requestBody = {
                      ...requestBody,
                      iosAppStreamData: {
                        bundleId: validatedContainerData.iosAppStreamData.bundleId,
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
          await revalidatePath(`/dashboard/ga/streams`);
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
    revalidatePath(`/dashboard/ga/streams`);
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

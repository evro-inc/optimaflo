'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, KeyEventType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { KeyEvents, FormsSchema } from '@/src/lib/schemas/ga/keyEvents';

/************************************************************************************
  Function to list GA conversionEvents
************************************************************************************/
export async function listGAKeyEvents() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `ga:keyEvents:userId:${userId}`;
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
              `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/keyEvents`
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
                throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
              }

              const responseBody = await response.json();

              if (responseBody && responseBody.keyEvents && responseBody.keyEvents.length > 0) {
                allData.push(responseBody);
              }

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
  Create a single property or multiple conversionEvents
************************************************************************************/
export async function createGAKeyEvents(formData: KeyEvents) {
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
  const cacheKey = `ga:keyEvents:userId:${userId}`;

  // Refactor: Use string identifiers in the set
  const toCreateKeyEvents = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4KeyEvents');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    conversionEventName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for creating key events.',
      results: [],
    };
  }

  if (toCreateKeyEvents.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateKeyEvents).map((identifier) => {
      const keyEventNames = identifier.eventName;
      return {
        id: [], // No property ID since creation did not happen
        name: keyEventNames, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create custom metric "${keyEventNames}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateKeyEvents.size} audience as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateKeyEvents.size} keyEvents as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const keyEventNames = formData.forms.map((cm) => cm.eventName);

  if (toCreateKeyEvents.size <= availableCreateUsage) {
    while (retries < MAX_RETRIES && toCreateKeyEvents.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = formData.forms.map(async (identifier) => {
              for (const account of identifier.accountProperty) {
                const url = `https://analyticsadmin.googleapis.com/v1alpha/${account}/keyEvents`;

                if (!identifier) {
                  errors.push(`Custom metric data not found for ${identifier}`);
                  toCreateKeyEvents.delete(identifier);
                  return;
                }

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
                    toCreateKeyEvents.delete(identifier);
                    return {
                      identifier,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated property data
                  const validatedData = validationResult.data.forms[0];

                  let requestBody: any = {
                    eventName: validatedData.eventName,
                    countingMethod: validatedData.countingMethod,
                  };

                  if (validatedData.defaultValue) {
                    requestBody.defaultValue = validatedData.defaultValue;
                  }

                  // Now, requestBody is prepared with the right structure based on the type
                  const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                  });

                  const parsedResponse = await response.json();

                  if (response.ok) {
                    successfulCreations.push(validatedData.eventName);
                    toCreateKeyEvents.delete(identifier);
                    fetchGASettings(userId);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { createUsage: { increment: 1 } },
                    });
                    creationResults.push({
                      conversionEventName: validatedData.eventName,
                      success: true,
                      message: `Successfully created property ${validatedData.eventName}`,
                    });
                  } else {
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      `GA4 Key Event: ${validatedData.eventName}`,
                      [validatedData.eventName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(validatedData.eventName);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push({
                          id: account,
                          name: validatedData.eventName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for property ${validatedData.eventName}.`
                      );
                    }

                    toCreateKeyEvents.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      conversionEventName: validatedData.eventName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating property ${identifier.eventName}: ${error.message}`
                  );
                  toCreateKeyEvents.delete(identifier);
                  creationResults.push({
                    conversionEventName: identifier.eventName,
                    success: false,
                    message: error.message,
                  });
                }
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
              message: `Feature limit reached for key events: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((eventName) => {
                // Find the name associated with the propertyId
                const conversionEventName =
                  keyEventNames.find((eventName) => eventName.includes(eventName)) || 'Unknown';
                return {
                  id: [conversionEventName], // Ensure id is an array
                  name: [conversionEventName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateKeyEvents.size === 0) {
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
      results: successfulCreations.map((conversionEventName) => ({
        conversionEventName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    return {
      id: form.accountProperty.map((account) => account), // Map over account array
      name: [form.eventName],
      success: true,
      notFound: false,
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual property IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Custom metrics created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Update a single property or multiple custom metrics
************************************************************************************/
export async function updateGAKeyEvents(formData: KeyEvents) {
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
  const cacheKey = `ga:keyEvents:userId:${userId}`;

  // Refactor: Use string identifiers in the set
  const toUpdateKeyEvents = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4KeyEvents');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const updateResults: {
    conversionEventName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for creating key events.',
      results: [],
    };
  }

  if (toUpdateKeyEvents.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateKeyEvents).map((identifier) => {
      const keyEventNames = identifier.eventName;
      return {
        id: [], // No property ID since update did not happen
        name: keyEventNames, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update custom metric "${keyEventNames}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateKeyEvents.size} audience as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateKeyEvents.size} keyEvents as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const keyEventNames = formData.forms.map((cm) => cm.eventName);

  if (toUpdateKeyEvents.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateKeyEvents.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = formData.forms.map(async (identifier) => {
              for (const account of identifier.accountProperty) {
                (identifier) => {
                  if (!identifier) {
                    errors.push(`Key event data not found for ${identifier}`);
                    toUpdateKeyEvents.delete(identifier);
                    return;
                  }
                };
                const updateFields: string[] = ['countingMethod', 'defaultValue'];

                /* if (identifier.includeDefaultValue == true && identifier.defaultValue) {
                  updateFields.push('defaultValue');
                } */

                const updateMask = updateFields.join(',');

                const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.accountProperty}?updateMask=${updateMask}`;

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
                    toUpdateKeyEvents.delete(identifier);
                    return {
                      identifier,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated property data
                  const validatedData = validationResult.data.forms[0];

                  let requestBody: any = {
                    countingMethod: validatedData.countingMethod,
                  };

                  if (validatedData.defaultValue) {
                    requestBody.defaultValue = validatedData.defaultValue;
                  }

                  // Now, requestBody is prepared with the right structure based on the type
                  const response = await fetch(url, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                  });

                  const parsedResponse = await response.json();

                  if (response.ok) {
                    successfulCreations.push(validatedData.eventName);
                    toUpdateKeyEvents.delete(identifier);
                    fetchGASettings(userId);

                    await prisma.tierLimit.update({
                      where: { id: tierLimitResponse.id },
                      data: { updateUsage: { increment: 1 } },
                    });
                    updateResults.push({
                      conversionEventName: validatedData.eventName,
                      success: true,
                      message: `Successfully updated property ${validatedData.eventName}`,
                    });
                  } else {
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      `GA4 Key Event: ${validatedData.eventName}`,
                      [validatedData.eventName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReached.push(validatedData.eventName);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push({
                          id: account,
                          name: validatedData.eventName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for property ${validatedData.eventName}.`
                      );
                    }

                    toUpdateKeyEvents.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    updateResults.push({
                      conversionEventName: validatedData.eventName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating property ${identifier.eventName}: ${error.message}`
                  );
                  toUpdateKeyEvents.delete(identifier);
                  updateResults.push({
                    conversionEventName: identifier.eventName,
                    success: false,
                    message: error.message,
                  });
                }
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
              message: `Feature limit reached for key events: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((eventName) => {
                // Find the name associated with the propertyId
                const conversionEventName =
                  keyEventNames.find((eventName) => eventName.includes(eventName)) || 'Unknown';
                return {
                  id: [conversionEventName], // Ensure id is an array
                  name: [conversionEventName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toUpdateKeyEvents.size === 0) {
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
      results: successfulCreations.map((conversionEventName) => ({
        conversionEventName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    return {
      id: form.accountProperty.map((account) => account), // Map over account array
      name: [form.eventName],
      success: true,
      notFound: false,
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual property IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Custom metrics updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}
/************************************************************************************
  Delete a single property or multiple custom metrics
************************************************************************************/
export async function deleteGAKeyEvents(
  selectedKeyEvents: Set<KeyEventType>,
  keyEventNames: string[]
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
  const toDeleteKeyEvents = new Set<KeyEventType>(selectedKeyEvents);
  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const cacheKey = `ga:keyEvents:userId:${userId}`;

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4KeyEvents');
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
      message: 'Feature limit reached for deleting key events',
      results: [],
    };
  }

  if (toDeleteKeyEvents.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteKeyEvents.size} key events as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteKeyEvents.size} key events as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteKeyEvents.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteKeyEvents.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteKeyEvents).map(async (identifier) => {
              const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.name}`;

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

                const cleanedParentId = identifier?.name?.split('/')[1];

                if (response.ok) {
                  if (identifier.name) {
                    IdsProcessed.add(identifier.name);
                    successfulDeletions.push({
                      name: identifier.name,
                    });
                  }

                  toDeleteKeyEvents.delete(identifier);

                  await prisma.ga.deleteMany({
                    where: {
                      accountId: `${identifier?.name?.split('/')[1]}`,
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
                    eventName: identifier.eventName,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GA4 Key Event',
                    keyEventNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      if (typeof identifier.name === 'string') {
                        // Ensure identifier.name is a string
                        featureLimitReached.push({
                          name: identifier.name,
                        });
                      }
                    } else if (errorResult.errorCode === 404) {
                      if (typeof identifier.name === 'string') {
                        // Ensure identifier.name is a string
                        notFoundLimit.push({
                          name: identifier.name,
                        });
                      }
                    } else {
                      errors.push(`An unknown error occurred for property ${keyEventNames}.`);
                    }

                    toDeleteKeyEvents.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting property ${identifier.name}: ${error.message}`);
              }
              if (identifier.name) {
                IdsProcessed.add(identifier.name);
              }
              toDeleteKeyEvents.delete(identifier);
              return { name: identifier.name, success: false };
            });

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete custom metric. Please check your permissions. Property Name: 
              ${keyEventNames.find((name) =>
                name.includes(name)
              )}. All other custom metrics were successfully deleted.`,
              results: notFoundLimit.map(({ name }) => ({
                id: [name], // Combine accountId and propertyId into a single array of strings
                name: [keyEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
              message: `Feature limit reached for custom metrics: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map(({ name }) => ({
                id: [name], // Ensure id is an array
                name: [keyEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedKeyEvents.size) {
            break; // Exit loop if all custom metrics are processed successfully
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
        name: [keyEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
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
    message: `Successfully deleted ${successfulDeletions.length} custom metric(s)`,
    features: successfulDeletions.map(({ name }) => `${name}`),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ name }) => ({
      id: [name], // Ensure id is an array
      name: [keyEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

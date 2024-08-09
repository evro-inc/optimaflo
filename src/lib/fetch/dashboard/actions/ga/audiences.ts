'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, AudienceType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { Audience, FormsSchema } from '@/src/lib/schemas/ga/audiences';

/************************************************************************************
  Function to list GA conversionEvents
************************************************************************************/
export async function listGAAudiences() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const cacheKey = `ga:audiences:userId:${userId}`;
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
              `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/audiences`
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
  Create a single property or multiple conversionEvents
************************************************************************************/
export async function createGAAudiences(formData: Audience) {
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
  const cacheKey = `ga:audiences:userId:${userId}`;

  // Refactor: Use string identifiers in the set
  const toCreateAudiences = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4Audiences');
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
      message: 'Feature limit reached for creating custom metric',
      results: [],
    };
  }

  if (toCreateAudiences.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateAudiences).map((identifier) => {
      const displayName = identifier.displayName;
      return {
        id: [], // No property ID since creation did not happen
        name: displayName, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create custom metric "${displayName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateAudiences.size} audience as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateAudiences.size} audiences as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const conversionEventNames = formData.forms.map((cm) => cm.displayName);

  if (toCreateAudiences.size <= availableCreateUsage) {
    while (retries < MAX_RETRIES && toCreateAudiences.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateAudiences).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Custom metric data not found for ${identifier}`);
                toCreateAudiences.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.property}/audiences`;

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
                  toCreateAudiences.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedData = validationResult.data.forms[0];

                // Function to dynamically build filter expressions
                const buildFilterExpression = (filterExpression: any): any => {
                  let result: any = {};

                  // Handle different types of filter expressions
                  if (filterExpression.andGroup) {
                    result.andGroup = {
                      filterExpressions:
                        filterExpression.andGroup.filterExpressions.map(buildFilterExpression),
                    };
                  } else if (filterExpression.orGroup) {
                    result.orGroup = {
                      filterExpressions:
                        filterExpression.orGroup.filterExpressions.map(buildFilterExpression),
                    };
                  } else if (filterExpression.notExpression) {
                    result.notExpression = buildFilterExpression(filterExpression.notExpression);
                  } else if (filterExpression.dimensionOrMetricFilter) {
                    result.dimensionOrMetricFilter = {
                      ...filterExpression.dimensionOrMetricFilter,
                    };
                  } else if (filterExpression.eventFilter) {
                    result.eventFilter = { ...filterExpression.eventFilter };
                  }

                  return result;
                };

                // Function to dynamically construct filter clauses from formData
                const buildFilterClauses = (filterClauses: any[]): any[] => {
                  return filterClauses.map((clause) => {
                    let result: any = { clauseType: clause.clauseType };

                    if (clause.simpleFilter) {
                      result.simpleFilter = {
                        scope: clause.simpleFilter.scope,
                        filterExpression: buildFilterExpression(
                          clause.simpleFilter.filterExpression
                        ),
                      };
                    }

                    if (clause.sequenceFilter) {
                      result.sequenceFilter = {
                        scope: clause.sequenceFilter.scope,
                        sequenceSteps: clause.sequenceFilter.sequenceSteps.map((step) => ({
                          scope: step.scope,
                          immediatelyFollows: step.immediatelyFollows,
                          filterExpression: buildFilterExpression(step.filterExpression),
                        })),
                      };
                    }

                    return result;
                  });
                };

                let requestBody = {
                  displayName: validatedData.displayName,
                  description: validatedData.description,
                  membershipDurationDays: validatedData.membershipDurationDays,
                  adsPersonalizationEnabled: validatedData.adsPersonalizationEnabled,
                  eventTrigger: validatedData.eventTrigger
                    ? {
                        eventName: validatedData.eventTrigger.eventName,
                        logCondition: validatedData.eventTrigger.logCondition,
                      }
                    : undefined, // Include eventTrigger only if present
                  exclusionDurationMode: validatedData.exclusionDurationMode,
                  filterClauses: buildFilterClauses(validatedData.filterClauses),
                };

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedData.name);
                  toCreateAudiences.delete(identifier);
                  fetchGASettings(userId);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    conversionEventName: validatedData.name,
                    success: true,
                    message: `Successfully created property ${validatedData.name}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'conversionEvent',
                    [validatedData.name]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedData.name);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedData.name,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for property ${validatedData.name}.`);
                  }

                  toCreateAudiences.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    conversionEventName: validatedData.name,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating property ${identifier.name}: ${error.message}`);
                toCreateAudiences.delete(identifier);
                creationResults.push({
                  conversionEventName: identifier.name,
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
              message: `Feature limit reached for custom metrics: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map(() => {
                // Find the name associated with the propertyId
                const conversionEventName =
                  conversionEventNames.find((eventName) => eventName.includes(eventName)) ||
                  'Unknown';
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

          if (toCreateAudiences.size === 0) {
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
    // Ensure that form.propertyId is defined before adding it to the array
    const conversionEventId = form.name ? [form.name] : []; // Provide an empty array as a fallback
    return {
      id: conversionEventId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
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
    message: 'Custom metrics created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Update a single property or multiple custom metrics
************************************************************************************/
export async function updateGAAudiences(formData: Audience) {
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
  const toUpdateAudiences = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4Audiences');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

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
      message: 'Feature limit reached for creating Custom Metrics',
      results: [],
    };
  }

  if (toUpdateAudiences.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateAudiences).map((identifier) => {
      const eventName = identifier.eventName;
      return {
        id: [], // No property ID since creation did not happen
        name: eventName, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update custom metric "${eventName}".`,
        // remaining creation limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateAudiences.size} custom metrics as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      errors: [
        `Cannot update ${toUpdateAudiences.size} custom metrics as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const conversionEventNames = formData.forms.map((cm) => cm.eventName);

  if (toUpdateAudiences.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateAudiences.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateAudiences).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Custom metrics data not found for ${identifier}`);
                toUpdateAudiences.delete(identifier);
                return;
              }

              const updateFields = ['countingMethod', 'defaultConversionValue'];

              const updateMask = updateFields.join(',');
              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.name}?updateMask=${updateMask}`;

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
                  toUpdateAudiences.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  countingMethod: validatedContainerData.countingMethod,
                  defaultConversionValue: {
                    value: validatedContainerData.defaultConversionValue?.value,
                    currencyCode: validatedContainerData.defaultConversionValue?.currencyCode,
                  },
                };

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'PATCH',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.eventName);
                  toUpdateAudiences.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    conversionEventName: validatedContainerData.eventName,
                    success: true,
                    message: `Successfully updated property ${validatedContainerData.eventName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'conversionEvents',
                    [validatedContainerData.eventName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.eventName);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedContainerData.eventName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.eventName}.`
                    );
                  }

                  toUpdateAudiences.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    conversionEventName: validatedContainerData.eventName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating property ${identifier.eventName}: ${error.message}`
                );
                toUpdateAudiences.delete(identifier);
                creationResults.push({
                  conversionEventName: identifier.eventName,
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
              message: `Feature limit reached for custom metrics: ${featureLimitReached.join(
                ', '
              )}`,
              results: featureLimitReached.map(() => {
                // Find the name associated with the propertyId
                const conversionEventName =
                  conversionEventNames.find((eventName) => eventName.includes(eventName)) ||
                  'Unknown';
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

          if (toUpdateAudiences.size === 0) {
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
      results: successfulCreations.map((conversionEventName) => ({
        conversionEventName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:audiences:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const conversionEventId = form.eventName ? [form.eventName] : []; // Provide an empty array as a fallback
    return {
      id: conversionEventId, // Ensure id is an array of strings
      name: [form.eventName], // Wrap the string in an array
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
    message: 'Custom Metric updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Delete a single property or multiple custom metrics
************************************************************************************/
export async function deleteGAAudiences(
  selectedAudiences: Set<AudienceType>,
  conversionEventNames: string[]
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
  const toDeleteAudiences = new Set<AudienceType>(selectedAudiences);
  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const cacheKey = `ga:audiences:userId:${userId}`;

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4Audiences');
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
      message: 'Feature limit reached for Deleting Custom Metrics',
      results: [],
    };
  }

  if (toDeleteAudiences.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteAudiences.size} custom metrics as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteAudiences.size} custom metrics as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteAudiences.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteAudiences.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteAudiences).map(async (identifier) => {
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

                const cleanedParentId = identifier.name.split('/')[1];

                if (response.ok) {
                  IdsProcessed.add(identifier.name);
                  successfulDeletions.push({
                    name: identifier.name,
                  });
                  toDeleteAudiences.delete(identifier);
                  await prisma.ga.deleteMany({
                    where: {
                      accountId: `${identifier.account.split('/')[1]}`,
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
                    'GA4Audiences',
                    conversionEventNames
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
                      errors.push(
                        `An unknown error occurred for property ${conversionEventNames}.`
                      );
                    }

                    toDeleteAudiences.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting property ${identifier.name}: ${error.message}`);
              }
              IdsProcessed.add(identifier.name);
              toDeleteAudiences.delete(identifier);
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
              ${conversionEventNames.find((name) =>
                name.includes(name)
              )}. All other custom metrics were successfully deleted.`,
              results: notFoundLimit.map(({ name }) => ({
                id: [name], // Combine accountId and propertyId into a single array of strings
                name: [conversionEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
                name: [conversionEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedAudiences.size) {
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
        name: [conversionEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
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
      name: [conversionEventNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

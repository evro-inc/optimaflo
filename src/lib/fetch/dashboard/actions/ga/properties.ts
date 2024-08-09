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
import { FeatureResult, FeatureResponse, GA4PropertyType } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { FormsSchema } from '@/src/lib/schemas/ga/properties';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof FormsSchema>;
type FormUpdateSchema = z.infer<typeof FormsSchema>;

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

  const cacheKey = `ga:properties:userId:${userId}`;
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
          const uniqueAccountIds = Array.from(new Set(gaData.ga.map((item) => item.accountId)));

          const urls = uniqueAccountIds.map(
            (accountId) =>
              `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountId}`
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
              const properties = responseBody.properties || [];
              for (const property of properties) {
                const retentionSettingsUrl = `https://analyticsadmin.googleapis.com/v1beta/${property.name}/dataRetentionSettings`;
                try {
                  const retentionResponse = await fetch(retentionSettingsUrl, {
                    headers,
                  });
                  if (!retentionResponse.ok) {
                    throw new Error(
                      `HTTP error! status: ${retentionResponse.status}. ${retentionResponse.statusText}`
                    );
                  }
                  const retentionSettings = await retentionResponse.json();
                  allData.push({
                    ...property,
                    dataRetentionSettings: retentionSettings,
                  });
                } catch (error: any) {
                  // In case of an error, push the property without data retention settings
                  allData.push(property);
                  throw new Error(`Error fetching data retention settings: ${error.message}`);
                }
              }
              // Removed the problematic line here
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

        redis.set(cacheKey, JSON.stringify(allData));

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
  Delete a single or multiple properties
************************************************************************************/
export async function DeleteProperties(
  selectedProperties: Set<GA4PropertyType>,
  propertyNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{
    accountId: string;
    propertyId: string;
  }> = [];
  const featureLimitReached: { accountId: string; propertyId: string }[] = [];
  const notFoundLimit: { accountId: string; propertyId: string }[] = [];
  const toDeleteProperties = new Set<GA4PropertyType>(selectedProperties);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4Properties');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;
  const accountIdsProcessed = new Set<string>();

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Properties',
      results: [],
    };
  }

  if (toDeleteProperties.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteProperties.size} properties as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteProperties.size} properties as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteProperties.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteProperties.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteProperties).map(async (identifier) => {
              const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${identifier.name}`;
              const headers = {
                Authorization: `Bearer ${token}`,
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
                  accountIdsProcessed.add(identifier.parent);
                  successfulDeletions.push({
                    accountId: identifier.parent,
                    propertyId: identifier.name,
                  });
                  toDeleteProperties.delete(identifier);
                  await prisma.ga.deleteMany({
                    where: {
                      accountId: `accounts/${identifier.parent}`,
                      propertyId: identifier.name,
                      userId: userId, // Ensure this matches the user ID
                    },
                  });
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  return {
                    accountId: identifier.parent,
                    propertyId: identifier.name,
                    success: true,
                  };
                } else {
                  parsedResponse = await response.json();
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'property',
                    propertyNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        accountId: identifier.parent,
                        propertyId: identifier.name,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        accountId: identifier.parent,
                        propertyId: identifier.name,
                      }); // Track 404 errors
                    }
                  } else {
                    errors.push(`An unknown error occurred for property ${propertyNames}.`);
                  }

                  toDeleteProperties.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting property ${identifier.parent}: ${error.message}`);
              }
              accountIdsProcessed.add(identifier.parent);
              toDeleteProperties.delete(identifier);
              return { accountId: identifier.parent, success: false };
            });

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete property. Please check your permissions. Container Name: 
              ${propertyNames.find((name) =>
                name.includes(name)
              )}. All other properties were successfully deleted.`,
              results: notFoundLimit.map(({ accountId, propertyId }) => ({
                id: [accountId, propertyId], // Combine accountId and propertyId into a single array of strings
                name: [propertyNames.find((name) => name.includes(propertyId)) || 'Unknown'], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
              message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map(({ accountId, propertyId }) => ({
                id: [accountId, propertyId], // Ensure id is an array
                name: [propertyNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedProperties.size) {
            break; // Exit loop if all properties are processed successfully
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

        const cacheKey = `ga:properties:userId:${userId}`;
        await redis.del(cacheKey);

        await revalidatePath(`/dashboard/ga/properties`);
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
        ({ accountId, propertyId }) => `${accountId}-${propertyId}`
      ),
      errors: errors,
      results: successfulDeletions.map(({ accountId, propertyId }) => ({
        id: [accountId, propertyId], // Ensure id is an array
        name: [propertyNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    const specificCacheKey = `ga:properties:userId:${userId}`;
    await redis.del(specificCacheKey);
    // Revalidate paths if needed
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} property(s)`,
    features: successfulDeletions.map(({ accountId, propertyId }) => `${accountId}-${propertyId}`),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ accountId, propertyId }) => ({
      id: [accountId, propertyId], // Ensure id is an array
      name: [propertyNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single property or multiple properties
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
  const toCreateProperties = new Set(formData.forms.map((cd) => cd));

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
    const attemptedCreations = Array.from(toCreateProperties).map((identifier) => {
      const displayName = identifier.displayName;
      return {
        id: [], // No property ID since creation did not happen
        name: displayName, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create property "${displayName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
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
    while (retries < MAX_RETRIES && toCreateProperties.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateProperties).map(async (identifier) => {
              const propertyData = formData.forms.find(
                (prop) =>
                  prop.parent === identifier.parent &&
                  prop.displayName === identifier.displayName &&
                  prop.name === identifier.name &&
                  prop.timeZone === identifier.timeZone &&
                  prop.currencyCode === identifier.currencyCode &&
                  prop.industryCategory === identifier.industryCategory &&
                  prop.propertyType === identifier.propertyType
              );

              if (!propertyData) {
                errors.push(`Property data not found for ${identifier}`);
                toCreateProperties.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1beta/properties`;
              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [propertyData] };

                const validationResult = FormsSchema.safeParse(formDataToValidate);

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
                    propertyType: validatedContainerData.propertyType,
                    parent: validatedContainerData.parent,
                  }),
                });

                let parsedResponse;

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.displayName);
                  toCreateProperties.delete(identifier);
                  fetchGASettings(userId);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    propertyName: validatedContainerData.displayName,
                    success: true,
                    message: `Successfully created property ${validatedContainerData.displayName}`,
                  });
                } else {
                  parsedResponse = await response.json();

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
                        id: identifier.name,
                        name: validatedContainerData.displayName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.displayName}.`
                    );
                  }

                  toCreateProperties.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    propertyName: validatedContainerData.displayName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating property ${propertyData.displayName}: ${error.message}`
                );
                toCreateProperties.delete(identifier);
                creationResults.push({
                  propertyName: propertyData.displayName,
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
              message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((propertyId) => {
                // Find the name associated with the propertyId
                const propertyName =
                  propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
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
          await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 200));
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
    const propertyId = form.name ? [form.name] : []; // Provide an empty array as a fallback
    return {
      id: propertyId, // Ensure id is an array of strings
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
    message: 'Properties created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Create a single property or multiple properties
************************************************************************************/
export async function updateProperties(formData: FormUpdateSchema) {
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

  // Refactor: Use string identifiers in the set
  const toUpdateProperties = new Set(
    formData.forms.map((prop) => ({
      parent: prop.parent,
      displayName: prop.displayName,
      name: prop.name,
      timeZone: prop.timeZone,
      currencyCode: prop.currencyCode,
      industryCategory: prop.industryCategory,
      propertyType: prop.propertyType,
    }))
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4Properties');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    propertyName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating Workspaces',
      results: [],
    };
  }

  if (toUpdateProperties.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateProperties).map((identifier) => {
      const displayName = identifier.displayName;
      return {
        id: [], // No property ID since update did not happen
        name: displayName, // Include the property name from the identifier
        success: false,
        message: `Update limit reached. Cannot update property "${displayName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateProperties.size} properties as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateProperties.size} properties as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const propertyNames = formData.forms.map((prop) => prop.displayName);

  if (toUpdateProperties.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateProperties.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateProperties).map(async (identifier) => {
              const propertyData = formData.forms.find(
                (prop) =>
                  prop.parent === identifier.parent &&
                  prop.displayName === identifier.displayName &&
                  prop.name === identifier.name &&
                  prop.timeZone === identifier.timeZone &&
                  prop.currencyCode === identifier.currencyCode &&
                  prop.industryCategory === identifier.industryCategory &&
                  prop.propertyType === identifier.propertyType
              );

              if (!propertyData) {
                errors.push(`Property data not found for ${identifier}`);
                toUpdateProperties.delete(identifier);
                return;
              }

              const updateFields = ['displayName', 'timeZone', 'currencyCode', 'industryCategory'];
              const updateMask = updateFields.join(',');

              const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${identifier.parent}?updateMask=${updateMask}`;
              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { forms: [propertyData] };

                const validationResult = FormsSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateProperties.delete(identifier);
                  return {
                    propertyData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedpropertyData = validationResult.data.forms[0];
                const payload = JSON.stringify({
                  parent: `accounts/${validatedpropertyData.parent}`,
                  displayName: validatedpropertyData.displayName,
                  timeZone: validatedpropertyData.timeZone,
                  currencyCode: validatedpropertyData.currencyCode,
                  industryCategory: validatedpropertyData.industryCategory,
                });

                const response = await fetch(url, {
                  method: 'PATCH',
                  headers: headers,
                  body: payload,
                });

                const parsedResponse = await response.json();

                const propertyName = propertyData.name;

                if (response.ok) {
                  if (response.ok) {
                    // Push a string into the array, for example, a concatenation of propertyId and propertyId
                    successfulUpdates.push(
                      `${validatedpropertyData.parent}-${validatedpropertyData.name}`
                    );
                    // ... rest of your code
                  }
                  toUpdateProperties.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  UpdateResults.push({
                    propertyName: propertyName,
                    success: true,
                    message: `Successfully updated property ${propertyName}`,
                  });
                } else {
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
                        propertyNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.propertyId,
                        name: propertyName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for property ${propertyName}.`);
                  }

                  toUpdateProperties.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    propertyName: propertyName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception updating property ${propertyData.name}: ${error.message}`);
                toUpdateProperties.delete(identifier);
                UpdateResults.push({
                  propertyName: propertyData.name,
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
              message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((propertyId) => {
                // Find the name associated with the propertyId
                const propertyName =
                  propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
                return {
                  id: [propertyId], // Ensure id is an array
                  name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
              message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((propertyId) => {
                // Find the name associated with the propertyId
                const propertyName =
                  propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
                return {
                  id: [propertyId], // Ensure id is an array
                  name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.forms.length) {
            break;
          }

          if (toUpdateProperties.size === 0) {
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
      features: successfulUpdates,
      errors: errors,
      results: successfulUpdates.map((propertyName) => ({
        propertyName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0) {
    const cacheKey = `ga:properties:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const propertyId = form.name ? [form.name] : []; // Provide an empty array as a fallback
    return {
      id: propertyId, // Ensure id is an array of strings
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
    message: 'Properties updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Update user data retention settings for a Google Analytics 4 property
************************************************************************************/
export async function updateDataRetentionSettings(formData: FormUpdateSchema) {
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

  let parsedResponse: any;

  // Refactor: Use string identifiers in the set
  const toUpdateProperties = new Set(
    formData.forms.map((prop) => ({
      parent: prop.parent,
      displayName: prop.displayName,
      name: prop.name,
      timeZone: prop.timeZone,
      currencyCode: prop.currencyCode,
      industryCategory: prop.industryCategory,
      propertyType: prop.propertyType,
      retention: prop.retention,
      retentionReset: prop.resetOnNewActivity,
    }))
  );

  const UpdateResults: {
    propertyName: string;
    success: boolean;
    message?: string;
  }[] = [];

  let permissionDenied = false;
  const propertyNames = formData.forms.map((prop) => prop.displayName);

  while (retries < MAX_RETRIES && toUpdateProperties.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const updatePromises = Array.from(toUpdateProperties).map(async (identifier) => {
            const propertyData = formData.forms.find(
              (prop) =>
                prop.parent === identifier.parent &&
                prop.displayName === identifier.displayName &&
                prop.name === identifier.name &&
                prop.timeZone === identifier.timeZone &&
                prop.currencyCode === identifier.currencyCode &&
                prop.industryCategory === identifier.industryCategory &&
                prop.propertyType === identifier.propertyType &&
                prop.retention === identifier.retention &&
                prop.resetOnNewActivity === identifier.retentionReset
            );

            if (!propertyData) {
              errors.push(`Property data not found for ${identifier}`);
              toUpdateProperties.delete(identifier);
              return;
            }

            const updateFields = [
              'eventDataRetention', // Include the fields that need to be updated
              'resetUserDataOnNewActivity',
            ];
            const updateMask = updateFields.join(',');

            const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${identifier.name}/dataRetentionSettings?updateMask=${updateMask}`;
            const headers = {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept-Encoding': 'gzip',
            };

            try {
              const formDataToValidate = { forms: [propertyData] };

              const validationResult = FormsSchema.safeParse(formDataToValidate);

              if (!validationResult.success) {
                let errorMessage = validationResult.error.issues
                  .map((issue) => `${issue.path[0]}: ${issue.message}`)
                  .join('. ');
                errors.push(errorMessage);
                toUpdateProperties.delete(identifier);
                return {
                  propertyData,
                  success: false,
                  error: errorMessage,
                };
              }

              // Accessing the validated property data
              const validatedpropertyData = validationResult.data.forms[0];

              const payload = JSON.stringify({
                name: `accounts/${validatedpropertyData.parent}`,
                eventDataRetention: validatedpropertyData.retention,
                resetUserDataOnNewActivity: validatedpropertyData.resetOnNewActivity,
              });

              const response = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                body: payload,
              });

              parsedResponse = await response.json();

              const propertyName = propertyData.name;

              if (response.ok) {
                // Push a string into the array, for example, a concatenation of propertyId and propertyId
                successfulUpdates.push(
                  `${validatedpropertyData.parent}-${validatedpropertyData.name}`
                );
                // ... rest of your code

                toUpdateProperties.delete(identifier);
                redis.append(`ga:properties:userId:${userId}`, parsedResponse);

                UpdateResults.push({
                  propertyName: propertyName,
                  success: true,
                  message: `Successfully updated property ${propertyName}`,
                });
              } else {
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
                      propertyNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                    notFoundLimit.push({
                      id: identifier.name,
                      name: propertyName,
                    });
                  }
                } else {
                  errors.push(`An unknown error occurred for property ${propertyName}.`);
                }

                toUpdateProperties.delete(identifier);
                permissionDenied = errorResult ? true : permissionDenied;
                UpdateResults.push({
                  propertyName: propertyName,
                  success: false,
                  message: errorResult?.message,
                });
              }
            } catch (error: any) {
              errors.push(`Exception updating property ${propertyData.name}: ${error.message}`);
              toUpdateProperties.delete(identifier);
              UpdateResults.push({
                propertyName: propertyData.name,
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
            message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
            results: featureLimitReached.map((propertyId) => {
              // Find the name associated with the propertyId
              const propertyName =
                propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
              return {
                id: [propertyId], // Ensure id is an array
                name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
            message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
            results: featureLimitReached.map((propertyId) => {
              // Find the name associated with the propertyId
              const propertyName =
                propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
              return {
                id: [propertyId], // Ensure id is an array
                name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              };
            }),
          };
        }

        if (successfulUpdates.length === formData.forms.length) {
          break;
        }

        if (toUpdateProperties.size === 0) {
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
        redis.append(`ga:properties:userId:${userId}`, parsedResponse);
        await revalidatePath(`/dashboard/ga/properties`);
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
      results: successfulUpdates.map((propertyName) => ({
        propertyName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0) {
    redis.append(`ga:properties:userId:${userId}`, parsedResponse);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const propertyId = form.name ? [form.name] : []; // Provide an empty array as a fallback
    return {
      id: propertyId, // Ensure id is an array of strings
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
    message: 'Properties updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
Acknowledge user data collection for a Google Analytics 4 property
************************************************************************************/
export async function acknowledgeUserDataCollection(selectedRows) {
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

  let parsedResponse: any;

  // Refactor: Use string identifiers in the set
  const toUpdateProperties = new Set<GA4PropertyType>(
    selectedRows.map((prop) => ({
      name: prop.name,
    }))
  );

  const UpdateResults: {
    propertyName: string;
    success: boolean;
    message?: string;
  }[] = [];

  let permissionDenied = false;
  const propertyNames = selectedRows.map((prop) => prop.displayName);

  while (retries < MAX_RETRIES && toUpdateProperties.size > 0 && !permissionDenied) {
    try {
      const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const updatePromises = Array.from(toUpdateProperties).map(
            async (identifier: GA4PropertyType) => {
              const propertyData = selectedRows.find((prop) => prop.name === identifier.name);

              if (!propertyData) {
                errors.push(`Property data not found for ${identifier}`);
                toUpdateProperties.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${identifier.name}:acknowledgeUserDataCollection`;
              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const rowDataToValidate = { forms: [propertyData] };

                const validationResult = FormsSchema.safeParse(rowDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateProperties.delete(identifier);
                  return {
                    propertyData,
                    success: false,
                    error: errorMessage,
                  };
                }

                const payload = JSON.stringify({
                  acknowledgement:
                    'I acknowledge that I have the necessary privacy disclosures and rights from my end users for the collection and processing of their data, including the association of such data with the visitation information Google Analytics collects from my site and/or app property.',
                });

                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: payload,
                });

                parsedResponse = await response.json();

                const propertyName = propertyData.name;

                if (response.ok) {
                  // Push a string into the array, for example, a concatenation of propertyId and propertyId
                  successfulUpdates.push(propertyName);

                  toUpdateProperties.delete(identifier);

                  UpdateResults.push({
                    propertyName: propertyName,
                    success: true,
                    message: `Successfully updated property ${propertyName}`,
                  });
                } else {
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
                        propertyNames.find((name) => name.includes(identifier.name)) || 'Unknown';

                      notFoundLimit.push({
                        id: identifier.name,
                        name: propertyName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for property ${propertyName}.`);
                  }

                  toUpdateProperties.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    propertyName: propertyName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception updating property ${propertyData.name}: ${error.message}`);
                toUpdateProperties.delete(identifier);
                UpdateResults.push({
                  propertyName: propertyData.name,
                  success: false,
                  message: error.message,
                });
              }
            }
          );

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
            message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
            results: featureLimitReached.map((propertyId) => {
              // Find the name associated with the propertyId
              const propertyName =
                propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
              return {
                id: [propertyId], // Ensure id is an array
                name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
            message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
            results: featureLimitReached.map((propertyId) => {
              // Find the name associated with the propertyId
              const propertyName =
                propertyNames.find((name) => name.includes(propertyId)) || 'Unknown';
              return {
                id: [propertyId], // Ensure id is an array
                name: [propertyName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              };
            }),
          };
        }

        if (successfulUpdates.length === selectedRows.length) {
          break;
        }

        if (toUpdateProperties.size === 0) {
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
        redis.append(`ga:properties:userId:${userId}`, parsedResponse);
        await revalidatePath(`/dashboard/ga/properties`);
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
      results: successfulUpdates.map((propertyName) => ({
        propertyName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0) {
    redis.append(`ga:properties:userId:${userId}`, parsedResponse);
    revalidatePath(`/dashboard/ga/properties`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = selectedRows.map((row) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const propertyId = row.name ? [row.name] : []; // Provide an empty array as a fallback
    return {
      id: propertyId, // Ensure id is an array of strings
      name: [row.name], // Wrap the string in an array
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
    message: 'Properties updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
Returns metadata for dimensions and metrics available in reporting methods. Used to explore the dimensions and metrics. In this method, a Google Analytics GA4 Property Identifier is specified in the request, and the metadata response includes Custom dimensions and metrics as well as Universal metadata.
************************************************************************************/
export async function getMetadataProperties() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

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
          const uniqueAccountIds = Array.from(new Set(gaData.ga.map((item) => item.accountId)));

          const urls = uniqueAccountIds.map(
            (accountId) =>
              `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountId}`
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
              const properties = responseBody.properties || [];
              for (const property of properties) {
                const resUrl = `https://analyticsdata.googleapis.com/v1beta/${property.name}/metadata`;

                try {
                  const res = await fetch(resUrl, {
                    headers,
                  });

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${res.status}. ${res.statusText}`);
                  }
                  const jsonRes = await res.json();

                  allData.push({
                    ...property,
                    dataRetentionSettings: jsonRes,
                  });
                } catch (error: any) {
                  // In case of an error, push the property without data retention settings
                  allData.push(property);
                  throw new Error(`Error fetching data retention settings: ${error.message}`);
                }
              }
              // Removed the problematic line here
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });

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

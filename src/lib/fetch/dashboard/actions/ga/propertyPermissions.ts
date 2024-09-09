'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, AccessBinding } from '@/src/types/types';
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
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { PropertyPermissionsSchema, FormsSchema } from '@/src/lib/schemas/ga/propertyAccess';

const featureType: string = 'GA4PropertyAccess';


/************************************************************************************
  Function to list GA accountAccess
************************************************************************************/
/* export async function listGAAccessBindings() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const cacheKey = `ga:propertyAccess:userId:${userId}`;
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
              `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`
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
                if (response.status === 403) {
                  continue; // Skip the current iteration and proceed with the next property
                }
                throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
              }

              const responseBody = await response.json();
              allData.push(responseBody);
            } catch (error: any) {
              // For errors other than 403, you might still want to throw or handle them differently
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
 */






export async function listGAAccessBindings(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:propertyAccess:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.hgetall(cacheKey);
    if (Object.keys(cacheData).length > 0) {
      try {
        const parsedData = Object.values(cacheData).map((data) => JSON.parse(data));
        return parsedData;
      } catch (error) {
        console.error("Failed to parse cache data:", error);
        await redis.del(cacheKey); // Clear cache if parsing fails
      }
    }
  }

  // Fetch data from Prisma
  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { ga: true },
  });

  if (!data) return [];

  await ensureGARateLimit(userId);

  // Get unique propertyIds and form the API URLs
  const uniquePropertyIds = Array.from(new Set(data.ga.map((item) => item.propertyId)));
  const urls = uniquePropertyIds.map(
    (propertyId) =>
      `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`
  );

  console.log('urls', urls);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    console.log("alldata props", allData)
    const flattenedAccessBindings = allData.flatMap(item => item.accessBindings || []);



    // Filter out null/undefined/empty values
    const cleanedData = flattenedAccessBindings.filter((item) => item && Object.keys(item).length > 0);

    // Group access bindings by propertyId and ensure uniqueness
    const groupedAccessBindings = cleanedData.reduce((acc, accessBinding) => {
      const propertyId = accessBinding.name.split('/')[1]; // Extract propertyId from name
      if (!acc[propertyId]) {
        acc[propertyId] = { accessBindings: new Set() }; // Using Set to ensure uniqueness
      }
      acc[propertyId].accessBindings.add(JSON.stringify(accessBinding)); // Add unique accessBinding
      return acc;
    }, {});

    console.log("groupedAccessBindings", groupedAccessBindings);


    // Convert sets back to arrays and prepare for Redis storage
    Object.keys(groupedAccessBindings).forEach((propertyId) => {
      groupedAccessBindings[propertyId].accessBindings = Array.from(groupedAccessBindings[propertyId].accessBindings, (item: string) => JSON.parse(item));
    });


    try {
      // Use HMSET to store each property's access bindings under a single field
      const pipeline = redis.pipeline();
      Object.entries(groupedAccessBindings).forEach(([propertyId, propertyData]) => {
        const fieldKey = `properties/${propertyId}`;
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(propertyData));
      });

      pipeline.expire(cacheKey, 7776000); // Set expiration for 3 months since this data doesn't change too often
      await pipeline.exec(); // Execute the pipeline commands

      // Log the updated cache for debugging
      console.log("Updated Redis cache for key:", cacheKey, await redis.hgetall(cacheKey));

    } catch (cacheError) {
      console.error("Failed to set cache data with HSET:", cacheError);
    }

    return Object.values(groupedAccessBindings);
  } catch (apiError) {
    console.error("Error fetching properties from API:", apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}





/************************************************************************************
  Create a single property or multiple accountAccess
************************************************************************************/
export async function createGAAccessBindings(formData: PropertyPermissionsSchema) {
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
  const cacheKey = `ga:propertyAccess:userId:${userId}`;

  // Refactor: Use string identifiers in the set
  const toCreateAccessBindings = new Set(formData.forms.map((access) => access));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4PropertyAccess');
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
      message: 'Feature limit reached for creating user access at the account level.',
      results: [],
    };
  }

  if (toCreateAccessBindings.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateAccessBindings).map((identifier) => {
      const user = identifier.user;
      return {
        id: [], // No property ID since creation did not happen
        name: user, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create access at account level "${user}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateAccessBindings.size} custom metrics as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateAccessBindings.size} custom metrics as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const conversionEventNames = formData.forms.map((access) => access.user);

  if (toCreateAccessBindings.size <= availableCreateUsage) {
    while (retries < MAX_RETRIES && toCreateAccessBindings.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateAccessBindings).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Account access data not found for ${identifier}`);
                toCreateAccessBindings.delete(identifier);
                return;
              }
              const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.property}/accessBindings`;

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
                  toCreateAccessBindings.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  user: validatedContainerData.user,
                  roles: validatedContainerData.roles,
                };

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.user);
                  toCreateAccessBindings.delete(identifier);
                  fetchGASettings(userId);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    conversionEventName: validatedContainerData.user,
                    success: true,
                    message: `Successfully created property ${validatedContainerData.user}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'conversionEvent',
                    [validatedContainerData.user]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.user);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.account,
                        name: validatedContainerData.user,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.user}.`
                    );
                  }

                  toCreateAccessBindings.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    conversionEventName: validatedContainerData.user,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating property ${identifier.user}: ${error.message}`);
                toCreateAccessBindings.delete(identifier);
                creationResults.push({
                  conversionEventName: identifier.user,
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

          if (toCreateAccessBindings.size === 0) {
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
          await revalidatePath(`dashboard/ga/access-permissions`);
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
    revalidatePath(`dashboard/ga/access-permissions`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const conversionEventId = form.user ? [form.user] : []; // Provide an empty array as a fallback
    return {
      id: conversionEventId, // Ensure id is an array of strings
      name: [form.user], // Wrap the string in an array
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
    message: 'User access created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Update a single property or multiple custom metrics
************************************************************************************/
export async function updateGAAccessBindings(formData: PropertyPermissionsSchema) {
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
  const toUpdateAccessBindings = new Set(formData.forms.map((access) => access));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4PropertyAccess');
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
      message: 'Feature limit reached for udpating user access at the property level.',
      results: [],
    };
  }

  if (toUpdateAccessBindings.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateAccessBindings).map((identifier) => {
      const user = identifier.user;
      return {
        id: [], // No property ID since creation did not happen
        name: user, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update property access "${user}".`,
        // remaining creation limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateAccessBindings.size} property access as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      errors: [
        `Cannot update ${toUpdateAccessBindings.size} property access as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const conversionEventNames = formData.forms.map((access) => access.user);

  if (toUpdateAccessBindings.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateAccessBindings.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateAccessBindings).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Custom metrics data not found for ${identifier}`);
                toUpdateAccessBindings.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.name}`;

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
                  toUpdateAccessBindings.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  user: validatedContainerData.user,
                  roles: validatedContainerData.roles,
                };

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'PATCH',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.user);
                  toUpdateAccessBindings.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    conversionEventName: validatedContainerData.user,
                    success: true,
                    message: `Successfully updated property ${validatedContainerData.user}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'accountAccess',
                    [validatedContainerData.user]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.user);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.account,
                        name: validatedContainerData.user,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.user}.`
                    );
                  }

                  toUpdateAccessBindings.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    conversionEventName: validatedContainerData.user,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating property ${identifier.user}: ${error.message}`);
                toUpdateAccessBindings.delete(identifier);
                creationResults.push({
                  conversionEventName: identifier.user,
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

          if (toUpdateAccessBindings.size === 0) {
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
    const cacheKey = `ga:propertyAccess:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`dashboard/ga/access-permissions`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const conversionEventId = form.user ? [form.user] : []; // Provide an empty array as a fallback
    return {
      id: conversionEventId, // Ensure id is an array of strings
      name: [form.user], // Wrap the string in an array
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
/* export async function deleteGAAccessBindings(
  selectedAccessBindings: Set<AccessBinding>,
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
  const toDeleteAccessBindings = new Set<AccessBinding>(selectedAccessBindings);
  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const cacheKey = `ga:propertyAccess:userId:${userId}`;

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4PropertyAccess');
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
      message: 'Feature limit reached for deleting user access at the account level. ',
      results: [],
    };
  }

  if (toDeleteAccessBindings.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteAccessBindings.size} user as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteAccessBindings.size} user as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteAccessBindings.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteAccessBindings.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteAccessBindings).map(async (identifier) => {
              const url = `https://analyticsadmin.googleapis.com/v1alpha/${identifier.name}`;

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

                const parsedResponse = await response.json();

                if (response.ok) {
                  IdsProcessed.add(identifier?.user);
                  successfulDeletions.push({
                    name: identifier.user,
                  });
                  toDeleteAccessBindings.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  return {
                    name: identifier.name,
                    eventName: identifier.user,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GA4PropertyAccess',
                    conversionEventNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        name: identifier.user,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        name: identifier.user,
                      });
                    } else {
                      errors.push(
                        `An unknown error occurred for property ${conversionEventNames}.`
                      );
                    }

                    toDeleteAccessBindings.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting property ${identifier.name}: ${error.message}`);
              }
              IdsProcessed.add(identifier.user);
              toDeleteAccessBindings.delete(identifier);
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
              message: `Could not delete user. Please check your permissions. Property Name: 
              ${conversionEventNames.find((name) =>
                name.includes(name)
              )}. All other users were successfully deleted.`,
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
              message: `Feature limit reached for user account access: ${featureLimitReached.join(
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
          if (successfulDeletions.length === selectedAccessBindings.size) {
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

        await revalidatePath('/dashboard/ga/access-permissions');
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
    revalidatePath('/dashboard/ga/access-permissions');
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
 */





export async function deleteGAAccessBindings(
  selected: Set<AccessBinding>,
  names: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'delete');

  if (tierLimitResponse.limitReached || selected.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [`Cannot delete more permissions than available. You have ${availableUsage} deletions left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: { name: string; accountName: string }[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data: AccessBinding) => {
      console.log('data delete', data);



      const propertyId = data?.name?.split('/')[1]; // Extract the property ID from 'name'
      console.log('Extracted propertyId:', propertyId);

      const account = await prisma.ga.findFirst({
        where: { propertyId: propertyId, userId }, // Query the account info by propertyId
        select: { accountId: true }, // Only select the accountId
      });

      console.log('test a', account.accountId);


      if (!account) {
        errors.push(`Account not found for property ID: ${propertyId}`);
        return;
      }



      const url = `https://analyticsadmin.googleapis.com/v1alpha/${data.name}`;

      console.log('url del', url);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'properties', names);
        successfulDeletions.push({ name: data.name as string, accountName: data.accountName as string });

        console.log("successfulDeletions", successfulDeletions);


        await prisma.ga.deleteMany({
          where: {
            accountId: account.accountId, // Extract account ID from property ID
            propertyId: data.name,
            userId, // Ensure this matches the user ID
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });

      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name as string);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.name as string);
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
        type: "delete" as const,  // Explicitly set the type as "delete"
        property: {
          name: deletion.name,
          parent: deletion.accountName,
        }
      }));

      // Call softRevalidateFeatureCache for deletions
      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
        userId,
        operations // Pass the operations array for deletions
      );

    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }


  // Check for not found property and return response if applicable
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not delete property. Please check your permissions. Property Name: ${names.find((name) =>
        name.includes(name)
      )}. All other properties were successfully deleted.`,
      results: notFoundLimit.map((data) => ({
        id: [data], // Ensure id is an array
        name: [names.find((name) => name.includes(data)) || 'Unknown'], // Ensure name is an array
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
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((data) => ({
        id: [data], // Ensure id is an array
        name: [names.find((name) => name.includes(data)) || 'Unknown'], // Ensure name is an array
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
    message: `Successfully deleted ${successfulDeletions.length} property(ies)`,
    features: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],  // Wrap propertyId in an array to match FeatureResult type
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],  // Wrap name in an array to match FeatureResult type
      success: true,  // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],  // FeatureResult.id is an array
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],  // FeatureResult.name is an array
      success: true,  // FeatureResult.success indicates if the operation was successful
    })),
  };
}

'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GoogleAdsLink } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { GoogleAdsLinkSchemaType, FormsSchema } from '@/src/lib/schemas/ga/adsLinks';

/************************************************************************************
  Function to list GA GA4AdLinks
************************************************************************************/
export async function listGAGoogleAdsLinks() {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const cacheKey = `ga:ads:userId:${userId}`;
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
              `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/googleAdsLinks`
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
  Create a single property or multiple GA4AdLinks
************************************************************************************/
export async function createGAGoogleAdsLinks(formData: GoogleAdsLinkSchemaType) {
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
  const cacheKey = `ga:ads:userId:${userId}`;

  // Refactor: Use string identifiers in the set
  const toCreateGoogleAdsLinks = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GA4AdLinks');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    googleAdsLinkName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for creating google ad links',
      results: [],
    };
  }

  if (toCreateGoogleAdsLinks.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreateGoogleAdsLinks).map((identifier) => {
      const customerId = identifier.customerId;
      return {
        id: [], // No property ID since creation did not happen
        name: customerId, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create custom metric "${customerId}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreateGoogleAdsLinks.size} custom metrics as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateGoogleAdsLinks.size} custom metrics as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const googleAdsLinkNames = formData.forms.map((cm) => cm.customerId);

  if (toCreateGoogleAdsLinks.size <= availableCreateUsage) {
    while (retries < MAX_RETRIES && toCreateGoogleAdsLinks.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateGoogleAdsLinks).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Custom metric data not found for ${identifier}`);
                toCreateGoogleAdsLinks.delete(identifier);
                return;
              }

              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.property}/googleAdsLinks`;

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
                  toCreateGoogleAdsLinks.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  customerId: validatedContainerData.customerId,
                  adsPersonalizationEnabled: validatedContainerData.adsPersonalizationEnabled,
                };
                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.customerId);
                  toCreateGoogleAdsLinks.delete(identifier);
                  fetchGASettings(userId);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    googleAdsLinkName: validatedContainerData.customerId,
                    success: true,
                    message: `Successfully created property ${validatedContainerData.customerId}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'googleAdsLink',
                    [validatedContainerData.customerId]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.customerId);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedContainerData.customerId,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for property ${validatedContainerData.customerId}.`
                    );
                  }

                  toCreateGoogleAdsLinks.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    googleAdsLinkName: validatedContainerData.customerId,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating property ${identifier.customerId}: ${error.message}`
                );
                toCreateGoogleAdsLinks.delete(identifier);
                creationResults.push({
                  googleAdsLinkName: identifier.customerId,
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
                const googleAdsLinkName =
                  googleAdsLinkNames.find((eventName) => eventName.includes(eventName)) ||
                  'Unknown';
                return {
                  id: [googleAdsLinkName], // Ensure id is an array
                  name: [googleAdsLinkName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateGoogleAdsLinks.size === 0) {
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
          await revalidatePath(`/dashboard/ga/links`);
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
      results: successfulCreations.map((googleAdsLinkName) => ({
        googleAdsLinkName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/links`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const googleAdsLinkId = form.customerId ? [form.customerId] : []; // Provide an empty array as a fallback
    return {
      id: googleAdsLinkId, // Ensure id is an array of strings
      name: [form.customerId], // Wrap the string in an array
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
export async function updateGAGoogleAdsLinks(formData: GoogleAdsLinkSchemaType) {
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
  const toUpdateGoogleAdsLinks = new Set(formData.forms.map((cm) => cm));

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GA4AdLinks');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const creationResults: {
    googleAdsLinkName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating google ad links',
      results: [],
    };
  }

  if (toUpdateGoogleAdsLinks.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdateGoogleAdsLinks).map((identifier) => {
      const customerId = identifier.customerId;
      return {
        id: [], // No property ID since creation did not happen
        name: customerId, // Include the property name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update Google Ads "${customerId}".`,
        // remaining creation limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateGoogleAdsLinks.size} Google Ads as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      errors: [
        `Cannot update ${toUpdateGoogleAdsLinks.size} Google Ads as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const googleAdsLinkNames = formData.forms.map((cm) => cm.customerId);

  if (toUpdateGoogleAdsLinks.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateGoogleAdsLinks.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateGoogleAdsLinks).map(async (identifier) => {
              if (!identifier) {
                errors.push(`Google Ad data not found for ${identifier}`);
                toUpdateGoogleAdsLinks.delete(identifier);
                return;
              }

              const updateFields = ['adsPersonalizationEnabled'];

              const updateMask = updateFields.join(',');
              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.name}?updateMask=${updateMask}`;

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
                  toUpdateGoogleAdsLinks.delete(identifier);
                  return {
                    identifier,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated property data
                const validatedContainerData = validationResult.data.forms[0];

                let requestBody: any = {
                  customerId: validatedContainerData.customerId,
                  adsPersonalizationEnabled: validatedContainerData.adsPersonalizationEnabled,
                };

                // Now, requestBody is prepared with the right structure based on the type
                const response = await fetch(url, {
                  method: 'PATCH',
                  headers: headers,
                  body: JSON.stringify(requestBody),
                });

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedContainerData.customerId);
                  toUpdateGoogleAdsLinks.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    googleAdsLinkName: validatedContainerData.customerId,
                    success: true,
                    message: `Successfully updated Google Ad ${validatedContainerData.customerId}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GA4AdLinks',
                    [validatedContainerData.customerId]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedContainerData.customerId);
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        id: identifier.property,
                        name: validatedContainerData.customerId,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for Google ad ${validatedContainerData.customerId}.`
                    );
                  }

                  toUpdateGoogleAdsLinks.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    googleAdsLinkName: validatedContainerData.customerId,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating Google Ad ${identifier.customerId}: ${error.message}`
                );
                toUpdateGoogleAdsLinks.delete(identifier);
                creationResults.push({
                  googleAdsLinkName: identifier.customerId,
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
              message: `Feature limit reached for Google Ad: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map(() => {
                // Find the name associated with the propertyId
                const googleAdsLinkName =
                  googleAdsLinkNames.find((customerId) => customerId.includes(customerId)) ||
                  'Unknown';
                return {
                  id: [googleAdsLinkName], // Ensure id is an array
                  name: [googleAdsLinkName], // Ensure name is an array, match by propertyId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toUpdateGoogleAdsLinks.size === 0) {
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
      results: successfulCreations.map((googleAdsLinkName) => ({
        googleAdsLinkName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    const cacheKey = `ga:ads:userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/ga/links`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.map((form) => {
    // Ensure that form.propertyId is defined before adding it to the array
    const googleAdsLinkId = form.customerId ? [form.customerId] : []; // Provide an empty array as a fallback
    return {
      id: googleAdsLinkId, // Ensure id is an array of strings
      name: [form.customerId], // Wrap the string in an array
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
    message: 'Google Ad updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Delete a single property or multiple custom metrics
************************************************************************************/
export async function deleteGAGoogleAdsLinks(
  selectedGoogleAdsLinks: Set<GoogleAdsLink>,
  googleAdsLinkNames: string[]
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
  const toDeleteGoogleAdsLinks = new Set<GoogleAdsLink>(selectedGoogleAdsLinks);
  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  const cacheKey = `ga:ads:userId:${userId}`;

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GA4AdLinks');
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
      message: 'Feature limit reached for deleting Google Ad',
      results: [],
    };
  }

  if (toDeleteGoogleAdsLinks.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeleteGoogleAdsLinks.size} Google Ads as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteGoogleAdsLinks.size} Google Ads as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteGoogleAdsLinks.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeleteGoogleAdsLinks.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gaRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each property deletion
            const deletePromises = Array.from(toDeleteGoogleAdsLinks).map(async (identifier) => {
              const url = `https://analyticsadmin.googleapis.com/v1beta/${identifier.name}`;

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

                const cleanedParentId = identifier?.name?.split('/')[1];

                if (response.ok) {
                  IdsProcessed.add(identifier.customerId);
                  successfulDeletions.push({
                    name: identifier.customerId,
                  });
                  toDeleteGoogleAdsLinks.delete(identifier);
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
                    customerId: identifier.customerId,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GA4AdLinks',
                    googleAdsLinkNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({
                        name: identifier.customerId,
                      });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({
                        name: identifier.customerId,
                      });
                    } else {
                      errors.push(`An unknown error occurred for property ${googleAdsLinkNames}.`);
                    }

                    toDeleteGoogleAdsLinks.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(`Error deleting Google Ad ${identifier.name}: ${error.message}`);
              }
              IdsProcessed.add(identifier.customerId);
              toDeleteGoogleAdsLinks.delete(identifier);
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
              message: `Could not delete Google Ad. Please check your permissions. Google Ad: 
              ${googleAdsLinkNames.find((name) =>
                name.includes(name)
              )}. All other custom metrics were successfully deleted.`,
              results: notFoundLimit.map(({ name }) => ({
                id: [name], // Combine accountId and propertyId into a single array of strings
                name: [googleAdsLinkNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by propertyId or default to 'Unknown'
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
              message: `Feature limit reached for Google Ads: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map(({ name }) => ({
                id: [name], // Ensure id is an array
                name: [googleAdsLinkNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by accountId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedGoogleAdsLinks.size) {
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

        await revalidatePath('/dashboard/ga/links');
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
        name: [googleAdsLinkNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
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
    revalidatePath('/dashboard/ga/links');
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} Google Ad(s)`,
    features: successfulDeletions.map(({ name }) => `${name}`),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ name }) => ({
      id: [name], // Ensure id is an array
      name: [googleAdsLinkNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

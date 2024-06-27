'use server';
import { revalidatePath } from 'next/cache';
import {
  FormSchema,
  FormValuesType,
  UserPermissionSchema,
} from '@/src/lib/schemas/gtm/userPermissions';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/utils/server';
import { fetchGtmSettings } from '../..';

/************************************************************************************
  Function to list or get one GTM permissions
************************************************************************************/
export async function listGtmPermissions(skipCache = false) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;
  let responseBody: any;

  const cacheKey = `gtm:permissions:userId:${userId}`;

  if (!skipCache) {
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
          const uniquePairs = new Set(gtmData.gtm.map((data) => `${data.accountId}`));
          console.log('uniquePairs: ', uniquePairs);

          const urls = Array.from(uniquePairs).map((pair: any) => {
            const [accountId] = pair.split('-');
            return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/user_permissions`;
          });

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
              responseBody = await response.json();
              console.log('responseBody: ', responseBody);

              allData.push(responseBody.userPermission || []);
            } catch (error: any) {
              throw new Error(`Error fetching data: ${error.message}`);
            }
          }
        });
        redis.set(cacheKey, JSON.stringify(allData.flat()));

        console.log('allData: ', allData.flat());

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
  Create a single container or multiple containers
************************************************************************************/
export async function CreatePermissions(formData: FormValuesType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData: ', formData);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];
  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  const generatedPermissions = formData.emailAddresses.flatMap((email) =>
    formData.permissions.map((permission) => ({
      ...permission,
      emailAddress: email.emailAddress,
    }))
  );

  const toCreatePermissions = new Set(generatedPermissions);

  console.log('toCreatePermissions: ', toCreatePermissions);

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMPermissions');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    permissionName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Permissions',
      results: [],
    };
  }

  // refactor and verify
  if (toCreatePermissions.size > availableCreateUsage) {
    const attemptedCreations = Array.from(toCreatePermissions).map((identifier: any) => {
      const { name: permissionName } = identifier;
      return {
        id: [], // No permission ID since creation did not happen
        name: permissionName, // Include the permission name from the identifier
        success: false,
        message: `Creation limit reached. Cannot create permission "${permissionName}".`,
        // remaining creation limit
        remaining: availableCreateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot create ${toCreatePermissions.size} permissions as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreatePermissions.size} permissions as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const permissionNames = formData.permissions.map((cd) => cd.accountId);

  if (toCreatePermissions.size <= availableCreateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toCreatePermissions.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreatePermissions).map(async (identifier: any) => {
              console.log('identifier: ', identifier);

              const { accountId, emailAddress, accountAccess, containerAccess } = identifier;
              accountIdForCache = accountId;
              containerIdForCache = identifier.containerAccess[0].containerId;
              const permissionData = {
                accountId: accountId,
                emailAddress: emailAddress,
                accountAccess: accountAccess,
                containerAccess: containerAccess,
              };

              if (!permissionData) {
                errors.push(`Container data not found for ${identifier}`);
                toCreatePermissions.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${permissionData.accountId}/user_permissions`;
              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = {
                  emailAddresses: formData.emailAddresses,
                  permissions: [permissionData],
                };

                console.log('formDataToValidate', formDataToValidate);

                const validationResult = FormSchema.safeParse(formDataToValidate);

                console.log('validationResult: ', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toCreatePermissions.delete(identifier);
                  return {
                    permissionData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated permission data
                const validatedContainerData = validationResult.data.permissions[0];

                console.log('validatedContainerData: ', validatedContainerData);

                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify({
                    accountId: validatedContainerData.accountId,
                    emailAddress: validatedContainerData.emailAddress,
                    accountAccess: validatedContainerData.accountAccess,
                    containerAccess: validatedContainerData.containerAccess,
                  }),
                });

                console.log('response: ', response);

                const parsedResponse = await response.json();

                console.log('parsedResponse: ', parsedResponse);

                if (response.ok) {
                  successfulCreations.push(permissionName);
                  toCreatePermissions.delete(identifier);
                  fetchGtmSettings(userId);
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    permissionName: permissionName,
                    success: true,
                    message: `Successfully created permission ${permissionName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'permission',
                    [permissionName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(permissionName);
                    } else if (errorResult.errorCode === 404) {
                      const permissionName =
                        permissionNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: permissionName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for permission ${permissionName}.`);
                  }

                  toCreatePermissions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    permissionName: permissionName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(`Exception creating permission ${permissionName}: ${error.message}`);
                toCreatePermissions.delete(identifier);
                creationResults.push({
                  permissionName: permissionName,
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
              message: `Feature limit reached for permissions: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((permissionId) => {
                // Find the name associated with the permissionId
                const permissionName =
                  permissionNames.find((name) => name.includes(permissionId)) || 'Unknown';
                return {
                  id: [permissionId], // Ensure id is an array
                  name: [permissionName], // Ensure name is an array, match by permissionId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.permissions.length) {
            break;
          }

          if (toCreatePermissions.size === 0) {
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
        if (accountIdForCache && containerIdForCache && userId) {
          const cacheKey = `gtm:permissions:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/entities`);
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
      results: successfulCreations.map((permissionName) => ({
        permissionName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:permissions:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/entities`);
  }

  // Map over formData.forms to create the results array
  const results: FeatureResult[] = formData.permissions.map((form) => {
    // Ensure that form.permissionId is defined before adding it to the array
    const permissionId = form.permissionId ? [form.permissionId] : []; // Provide an empty array as a fallback
    return {
      id: permissionId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual permission IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

'use server';
import { revalidatePath } from 'next/cache';
import {
  FormSchema,
  FormValuesType,
  TransformedFormSchema,
  UserPermissionSchema,
} from '@/src/lib/schemas/gtm/userPermissions';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { limiter } from '../../../../bottleneck';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult, UserPermission } from '@/src/types/types';
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
  Create a single permission or multiple permissions
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
  const notFoundLimit: { id: string; name: string; message?: string }[] = [];
  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  const toCreatePermissions = new Set(formData.forms);

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
  const permissionNames = formData.forms.flatMap((form) =>
    form.permissions ? form.permissions.map((permission) => permission.accountId) : []
  );

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

              let validatedPermissionData;

              try {
                const formDataToValidate = {
                  forms: [permissionData],
                };

                console.log('formDataToValidate', formDataToValidate);

                const validationResult = TransformedFormSchema.safeParse(formDataToValidate);

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
                validatedPermissionData = validationResult.data.forms[0];

                console.log('validatedPermissionData: ', validatedPermissionData);

                const response = await fetch(url, {
                  method: 'POST',
                  headers: headers,
                  body: JSON.stringify({
                    accountId: validatedPermissionData.accountId,
                    emailAddress: validatedPermissionData.emailAddress,
                    accountAccess: validatedPermissionData.accountAccess,
                    containerAccess: validatedPermissionData.containerAccess,
                  }),
                });

                console.log('response: ', response);

                const parsedResponse = await response.json();

                console.log('parsedResponse: ', parsedResponse);

                if (response.ok) {
                  successfulCreations.push(validatedPermissionData.emailAddress);
                  toCreatePermissions.delete(identifier);
                  fetchGtmSettings(userId);
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { createUsage: { increment: 1 } },
                  });
                  creationResults.push({
                    permissionName: validatedPermissionData.emailAddress,
                    success: true,
                    message: `Successfully created permission for ${validatedPermissionData.emailAddress}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'permission',
                    [validatedPermissionData.emailAddress]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedPermissionData.emailAddress);
                    } else if (errorResult.errorCode === 404) {
                      const permissionName =
                        permissionNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: permissionName,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for permission ${validatedPermissionData.emailAddress}.`
                    );
                  }

                  toCreatePermissions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  creationResults.push({
                    permissionName: validatedPermissionData.emailAddress,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating permission ${validatedPermissionData.emailAddress}: ${error.message}`
                );
                toCreatePermissions.delete(identifier);
                creationResults.push({
                  permissionName: validatedPermissionData.emailAddress,
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

          if (successfulCreations.length === formData.forms.length) {
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
  const results: FeatureResult[] = formData.forms.flatMap((form) =>
    form.emailAddresses
      ? form.emailAddresses.map((emailObj) => ({
          id: [], // Ensure id is an array of strings
          name: [emailObj.emailAddress], // Wrap the string in an array
          success: true, // or false, depending on the actual result
          notFound: false, // Set this to the appropriate value based on your logic
        }))
      : []
  );

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

/************************************************************************************
  Udpate a single permission or multiple permissions
************************************************************************************/
export async function UpdatePermissions(formData: FormValuesType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  console.log('formData: ', formData);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string; message?: string }[] = [];
  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  const toUpdatePermissions = new Set(formData.forms);

  console.log('toUpdatePermissions: ', toUpdatePermissions);

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMPermissions');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const updateResults: {
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
  if (toUpdatePermissions.size > availableUpdateUsage) {
    const attemptedCreations = Array.from(toUpdatePermissions).map((identifier: any) => {
      const { name: permissionName } = identifier;
      return {
        id: [], // No permission ID since update did not happen
        name: permissionName, // Include the permission name from the identifier
        success: false,
        message: `Creation limit reached. Cannot update permission "${permissionName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdatePermissions.size} permissions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdatePermissions.size} permissions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedCreations,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const permissionNames = formData.forms.flatMap((form) =>
    form.permissions ? form.permissions.map((permission) => permission.accountId) : []
  );

  console.log('permissionNames', permissionNames);

  // need id permission
  if (toUpdatePermissions.size <= availableUpdateUsage) {
    // Initialize retries variable to ensure proper loop execution
    let retries = 0;
    while (retries < MAX_RETRIES && toUpdatePermissions.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdatePermissions).map(async (identifier: any) => {
              console.log('identifier: ', identifier);

              const { accountId, emailAddress, accountAccess, containerAccess, paths } = identifier;
              accountIdForCache = accountId;
              containerIdForCache = identifier.containerAccess[0].containerId;

              const permissionData = {
                accountId: accountId,
                emailAddress: emailAddress,
                accountAccess: accountAccess,
                containerAccess: containerAccess,
                paths: paths,
              };

              console.log('permissionData', permissionData);

              if (!permissionData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdatePermissions.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/${permissionData.paths}`;

              console.log('url', url);

              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              let validatedPermissionData;

              try {
                const formDataToValidate = {
                  forms: [permissionData],
                };

                console.log('formDataToValidate', formDataToValidate);

                const validationResult = TransformedFormSchema.safeParse(formDataToValidate);

                console.log('validationResult: ', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdatePermissions.delete(identifier);
                  return {
                    permissionData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated permission data
                validatedPermissionData = validationResult.data.forms[0];

                console.log('validatedPermissionData: ', validatedPermissionData);

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: JSON.stringify({
                    accountId: validatedPermissionData.accountId,
                    emailAddress: validatedPermissionData.emailAddress,
                    accountAccess: validatedPermissionData.accountAccess,
                    containerAccess: validatedPermissionData.containerAccess,
                  }),
                });

                console.log('response: ', response);

                const parsedResponse = await response.json();

                console.log('parsedResponse: ', parsedResponse);

                if (response.ok) {
                  successfulCreations.push(validatedPermissionData.emailAddress);
                  toUpdatePermissions.delete(identifier);
                  fetchGtmSettings(userId);
                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });
                  updateResults.push({
                    permissionName: validatedPermissionData.emailAddress,
                    success: true,
                    message: `Successfully updated permission for ${validatedPermissionData.emailAddress}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'GTM User Admin Access',
                    [validatedPermissionData.emailAddress]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(validatedPermissionData.emailAddress);
                    } else if (errorResult.errorCode === 404) {
                      const permissionName =
                        permissionNames.find((emailAddress) =>
                          emailAddress.includes(identifier.emailAddress)
                        ) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: permissionName,
                        message:
                          errorResult.message +
                          ' ' +
                          `You may need to ask an admin to grant admin permissions for Account ID: ${validatedPermissionData.accountId}.`,
                      });
                    }
                  } else {
                    errors.push(
                      `An unknown error occurred for permission ${validatedPermissionData.emailAddress}.`
                    );
                  }

                  toUpdatePermissions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  updateResults.push({
                    permissionName: validatedPermissionData.emailAddress,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating permission ${validatedPermissionData.emailAddress}: ${error.message}`
                );
                toUpdatePermissions.delete(identifier);
                updateResults.push({
                  permissionName: validatedPermissionData.emailAddress,
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
              notFoundError: true,
              features: [],

              results: notFoundLimit.map((item) => ({
                id: item.id,
                name: item.name,
                message: item.message,
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
                  permissionNames.find((emailAddress) => emailAddress.includes(permissionId)) ||
                  'Unknown';
                return {
                  id: [permissionId], // Ensure id is an array
                  name: [permissionName], // Ensure name is an array, match by permissionId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toUpdatePermissions.size === 0) {
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

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.forms.flatMap((form) =>
    form.emailAddresses
      ? form.emailAddresses.map((emailObj) => ({
          id: [], // Ensure id is an array of strings
          name: [emailObj.emailAddress], // Wrap the string in an array
          success: true, // or false, depending on the actual result
          notFound: false, // Set this to the appropriate value based on your logic
        }))
      : []
  );

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual permission IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

// NOT GETTING PATHS FOR URL.
/************************************************************************************
  Delete a single or multiple permissions
************************************************************************************/
export async function DeletePermissions(
  selectedPermissions: UserPermission[],
  permissionNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  console.log('selectedPermissions', selectedPermissions);

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: Array<{
    accountId: string;
    emailAddress: string;
  }> = [];
  const featureLimitReached: { accountId: string; emailAddress: string }[] = [];
  const notFoundLimit: { accountId: string; emailAddress: string }[] = [];

  const toDeletePermissions = new Set<{ accountId: string; emailAddress: string; path: string }>(
    selectedPermissions
      .filter((permission) => permission.path !== undefined)
      .map((permission) => ({
        accountId: permission.accountId,
        emailAddress: permission.emailAddress,
        path: permission.path as string,
      }))
  );

  let accountIdForCache: string | undefined;

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMPermissions');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;
  const permissionIdsProcessed = new Set<string>();

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Permissions',
      results: [],
    };
  }

  if (toDeletePermissions.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      features: [],
      errors: [
        `Cannot delete ${toDeletePermissions.size} permissions as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeletePermissions.size} permissions as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeletePermissions.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (retries < MAX_RETRIES && toDeletePermissions.size > 0 && !permissionDenied) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(toDeletePermissions).map(async (props) => {
              console.log('props', props);

              const { accountId, emailAddress, path } = props;
              accountIdForCache = accountId;

              const url = `https://www.googleapis.com/tagmanager/v2/${path}`;
              console.log('url', url);

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

                console.log('parsed res', parsedResponse);

                if (response.ok) {
                  permissionIdsProcessed.add(path);
                  successfulDeletions.push({ accountId, emailAddress });
                  toDeletePermissions.delete(props);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { deleteUsage: { increment: 1 } },
                  });

                  return {
                    accountId,
                    emailAddress,
                    success: true,
                  };
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'permission',
                    permissionNames
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push({ accountId, emailAddress });
                    } else if (errorResult.errorCode === 404) {
                      notFoundLimit.push({ accountId, emailAddress }); // Track 404 errors
                    }
                  } else {
                    errors.push(`An unknown error occurred for container ${permissionNames}.`);
                  }

                  toDeletePermissions.delete(props);
                  permissionDenied = errorResult ? true : permissionDenied;

                  if (selectedPermissions.length > 0) {
                    const firstPermissionId = selectedPermissions.values().next().value;
                    accountIdForCache = firstPermissionId.split('-')[0];
                  }
                }
              } catch (error: any) {
                // Handling exceptions during fetch
                errors.push(
                  `Error deleting permission ${accountId}-${emailAddress}: ${error.message}`
                );
              }
              permissionIdsProcessed.add(accountId);
              toDeletePermissions.delete(props);
              return { accountId, success: false };
            });

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Could not delete container. Please check your permissions. Container Name: 
              ${permissionNames.find((name) =>
                name.includes(name)
              )}. All other containers were successfully deleted.`,
              results: notFoundLimit.map(({ accountId, emailAddress }) => ({
                id: [accountId, emailAddress], // Combine containerId and permissionId into a single array of strings
                name: [permissionNames.find((name) => name.includes(emailAddress)) || 'Unknown'], // Ensure name is an array, match by permissionId or default to 'Unknown'
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
              message: `Feature limit reached for containers: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map(({ accountId, emailAddress }) => ({
                id: [accountId, emailAddress], // Ensure id is an array
                name: [permissionNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array, match by containerId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedPermissions.length) {
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

        const cacheKey = `gtm:permissions:userId:${userId}`;
        await redis.del(cacheKey);

        await revalidatePath(`/dashboard/gtm/entities`);
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
        ({ accountId, emailAddress }) => `${accountId}-${emailAddress}`
      ),
      errors: errors,
      results: successfulDeletions.map(({ accountId, emailAddress }) => ({
        id: [accountId, emailAddress], // Ensure id is an array
        name: [permissionNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    const specificCacheKey = `gtm:permissions:userId:${userId}`;
    await redis.del(specificCacheKey);

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/entities`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} container(s)`,
    features: successfulDeletions.map(
      ({ accountId, emailAddress }) => `${accountId}-${emailAddress}`
    ),
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map(({ accountId, emailAddress }) => ({
      id: [accountId, emailAddress], // Ensure id is an array
      name: [permissionNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

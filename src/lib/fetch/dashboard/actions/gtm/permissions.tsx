'use server';

import { FormSchema, TransformedDataSchemaType } from '@/src/lib/schemas/gtm/userPermissions';
import { redis } from '../../../../redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult, Permissions } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';

const featureType: string = 'GTMPermissions';

/************************************************************************************
  Function to list or get one GTM permissions
************************************************************************************/
export async function listGtmPermissions(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:permissions:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.hgetall(cacheKey);

    if (Object.keys(cacheData).length > 0) {
      try {
        const parsedData = Object.values(cacheData).map((data) => JSON.parse(data));

        return parsedData;
      } catch (error) {
        console.error('Failed to parse cache data:', error);
        await redis.del(cacheKey);
      }
    }
  }

  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { gtm: true },
  });

  if (!data) return [];

  await ensureGARateLimit(userId);

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  const urls = uniqueItems.map(
    ({ accountId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/user_permissions`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    const flattenedData = allData.flat();
    const cleanedData = flattenedData.filter((item) => Object.keys(item).length > 0);
    const ws = cleanedData.flatMap((item) => item.userPermission || []); // Flatten to get all workspaces directly

    console.log('ws one', ws);

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      ws.forEach((ws: any) => {
        const fieldKey = ws.path; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(ws));
        } else {
          console.warn('Skipping workspace with undefined name:', ws);
        }
      });

      pipeline.expire(cacheKey, 86400); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return ws; // Return only the ws array
  } catch (apiError) {
    console.error('Error fetching ws from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Create a single permission or multiple permissions
************************************************************************************/
export async function createPermissions(formData: {
  forms: TransformedDataSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'create'
  );

  console.log('formData', formData);

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot create more workspaces than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      // Validate the form data
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      // Extract emailAddresses and permissions from validatedData
      const emailAddresses = validatedData.forms[0].emailAddresses;
      const permissions = validatedData.forms[0].permissions;

      // Iterate over each email address
      for (const emailObj of emailAddresses) {
        const emailAddress = emailObj.emailAddress;

        // Iterate over each permission
        for (const permission of permissions) {
          const accountId = permission.accountId;
          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/user_permissions`;
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          try {
            const res = await executeApiRequest(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                accountId: accountId,
                emailAddress: emailAddress,
                accountAccess: permission.accountAccess,
                containerAccess: permission.containerAccess,
              }),
            });

            // Add the created permission to successful creations
            successfulCreations.push(res);

            // Update the usage limit
            await prisma.tierLimit.update({
              where: { id: tierLimitResponse.id },
              data: { createUsage: { increment: 1 } },
            });
          } catch (error: any) {
            if (error.message === 'Feature limit reached') {
              featureLimitReached.push(emailAddress ?? 'Unknown');
            } else if (error.message.includes('404')) {
              notFoundLimit.push({ id: accountId ?? 'Unknown', name: emailAddress ?? 'Unknown' });
            } else {
              errors.push(error.message);
            }
          }
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successfulCreations.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successfulCreations.map((creation) => ({
        crudType: 'create' as const, // Explicitly set the type as "create"
        ...creation,
      }));
      const cacheFields = successfulCreations.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:permissions:userId:${userId}`],
        `/dashboard/gtm/entities`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Check for not found errors and return if any
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some permissions could not be found: ${notFoundLimit
        .map((item) => item.name)
        .join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [],
        name: [item.name],
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
      message: `Feature limit reached for permissions: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((propertyName) => ({
        id: [],
        name: [propertyName],
        success: false,
        featureLimitReached: true,
      })),
    };
  }

  // Proceed with general error handling if needed
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
    message: `Successfully created ${successfulCreations.length} permission(s)`,
    features: successfulCreations.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulCreations.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

/************************************************************************************
  Udpate a single permission or multiple permissions
************************************************************************************/
/* export async function UpdatePermissions(formData: FormValuesType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string; message?: string }[] = [];

  const toUpdatePermissions = new Set(formData.forms);

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
              const { accountId, emailAddress, accountAccess, containerAccess, paths } = identifier;

              const permissionData = {
                accountId: accountId,
                emailAddress: emailAddress,
                accountAccess: accountAccess,
                containerAccess: containerAccess,
                paths: paths,
              };

              if (!permissionData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdatePermissions.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/${permissionData.paths}`;

              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              let validatedPermissionData;

              try {
                const formDataToValidate = {
                  forms: [permissionData],
                };

                const validationResult = TransformedFormSchema.safeParse(formDataToValidate);

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

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(validatedPermissionData.emailAddress);
                  toUpdatePermissions.delete(identifier);

                  await prisma.gtmPermissions.upsert({
                    where: {
                      accountId_emailAddress: {
                        accountId: validatedPermissionData.accountId, // The unique identifier in the upsert condition
                        emailAddress: validatedPermissionData.emailAddress, // The email address associated with the permission
                      },
                    },
                    update: {
                      accountAccess: JSON.stringify(validatedPermissionData.accountAccess), // Assuming accountAccess needs to be stored as JSON
                      containerAccess: JSON.stringify(validatedPermissionData.containerAccess), // Assuming containerAccess needs to be stored as JSON
                    },
                    create: {
                      accountId: validatedPermissionData.accountId,
                      emailAddress: validatedPermissionData.emailAddress,
                      accountAccess: JSON.stringify(validatedPermissionData.accountAccess),
                      containerAccess: JSON.stringify(validatedPermissionData.containerAccess),
                      userId: userId, // Associating the permission with the user
                    },
                  });

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
        if (userId) {
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

  if (successfulCreations.length > 0) {
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
} */

// NOT GETTING PATHS FOR URL.
/************************************************************************************
  Delete a single or multiple permissions
************************************************************************************/
export async function deletePermissions(
  selected: Set<Permissions>,
  names: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'delete'
  );

  if (tierLimitResponse.limitReached || selected.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [
        `Cannot delete more permissions than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data: Permissions) => {
      const url = `https://www.googleapis.com/tagmanager/v2/${data.path}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'containers', names);
        successfulDeletions.push(data);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.path);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.path);
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
        crudType: 'delete' as const, // Explicitly set the type as "delete"
        ...deletion,
      }));
      const cacheFields = successfulDeletions.map((del) => `${del.path}`);

      await softRevalidateFeatureCache(
        [`gtm:permissions:userId:${userId}`],
        `/dashboard/gtm/entities`,
        userId,
        operations,
        cacheFields
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
      message: `Could not delete permission. Please check your permissions. Permission Name: ${names.find(
        (name) => name.includes(name)
      )}. All other permissions were successfully deleted.`,
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
      message: `Feature limit reached for permissions: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length} permission(s)`,
    features: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name], // Wrap propertyId in an array to match FeatureResult type
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'], // Wrap name in an array to match FeatureResult type
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name], // FeatureResult.id is an array
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'], // FeatureResult.name is an array
      success: true, // FeatureResult.success indicates if the operation was successful
    })),
  };
}

/* export async function DeletePermissions(
  selectedPermissions: UserPermission[],
  permissionNames: string[]
): Promise<FeatureResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

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
              const { accountId, emailAddress, path } = props;

              const url = `https://www.googleapis.com/tagmanager/v2/${path}`;

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
 */

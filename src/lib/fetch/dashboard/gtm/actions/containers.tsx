'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateContainerSchema,
  UpdateContainerSchema,
} from '@/src/lib/schemas/containers';
import z from 'zod';
import { auth } from '@clerk/nextjs';
import { gtmRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { listGtmAccounts } from './accounts';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { ContainerResult, ContainersResponse } from '@/src/lib/types/types';
import {
  handleApiResponseError,
  tierCreateLimit,
  tierDeleteLimit,
  tierUpdateLimit,
} from '@/src/lib/helpers/server';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateContainerSchema>;

/************************************************************************************
  Function to list GTM containers
************************************************************************************/
export async function listGtmContainers(
  accessToken: string,
  accountId: string,
  accountName: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const cachedValue = await redis.get(`user:${userId}-gtm:containers`);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        let data;
        await limiter.schedule(async () => {
          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;
          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };

          const response = await fetch(url, { headers });

          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}. ${response.statusText}`
            );
          }

          const responseBody = await response.json();

          data = responseBody.container || [];
        });

        redis.set(
          `gtm:containers-userId:${userId}`,
          JSON.stringify(data),
          'EX',
          60 * 60 * 2
        );

        return {
          accountName,
          containers: data,
        };
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get accounts...');
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
  Fetch all containers for all accounts
************************************************************************************/
export async function listAllGtmContainers(accessToken: string) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const { userId } = auth();
  const cacheKey = `gtm:containers-userId:${userId}`;
  const cachedValue = await redis.get(cacheKey);
  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        // Fetch accounts
        const accounts = await listGtmAccounts(accessToken);

        // Fetch containers for each account in parallel
        const containersPromises = accounts.map((account) =>
          listGtmContainers(accessToken, account.accountId, account.name)
        );

        // Get results for all accounts
        const containersResults = await Promise.all(containersPromises);

        // Combine containers from all accounts into one array
        const combinedContainers = containersResults.flatMap((result) => {
          return result.containers.map((container) => ({
            ...container,
            accountName: result.accountName,
          }));
        });

        // Cache the result in Redis
        await redis.set(
          cacheKey,
          JSON.stringify(combinedContainers),
          'EX',
          60 * 60 * 24 * 7 // Cache for 7 days
        );

        // Return combined containers
        return combinedContainers;
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      // Handling rate limit exceeded error
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get accounts...');
        // Adding jitter to avoid simultaneous retries
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        // Increasing the delay for the next retry
        delay *= 2;
        retries++;
      } else {
        // Throwing other types of errors
        throw error;
      }
    }
  }
}

/************************************************************************************
  Delete a single or multiple containers
************************************************************************************/
export async function DeleteContainers(
  selectedContainers: Set<string>,
  containerNames: string[]
): Promise<ContainersResponse> {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Arrays to track various outcomes
  const errors: string[] = [];
  const successfulDeletions: string[] = [];
  const featureLimitReachedContainers: string[] = [];
  const notFoundLimit: string[] = [];
  const toDeleteContainers = new Set(selectedContainers);

  // Authenticating user and getting user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Check for feature limit using Prisma ORM
  const tierLimitResponse: any = await tierDeleteLimit(userId, 'GTMContainer');
  const limit = Number(tierLimitResponse.deleteLimit);
  const deleteUsage = Number(tierLimitResponse.deleteUsage);
  const availableDeleteUsage = limit - deleteUsage;

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      errors: [],
      message: 'Feature limit reached for Deleting Containers',
      results: [],
    };
  }

  if (toDeleteContainers.size > availableDeleteUsage) {
    // If the deletion request exceeds the available limit
    return {
      success: false,
      containers: [],
      errors: [
        `Cannot delete ${toDeleteContainers.size} containers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
      ],
      results: [],
      limitReached: true,
      message: `Cannot delete ${toDeleteContainers.size} containers as it exceeds the available limit. You have ${availableDeleteUsage} more deletion(s) available.`,
    };
  }
  let permissionDenied = false;

  if (toDeleteContainers.size <= availableDeleteUsage) {
    // Retry loop for deletion requests
    while (
      retries < MAX_RETRIES &&
      toDeleteContainers.size > 0 &&
      !permissionDenied
    ) {
      try {
        // Enforcing rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          await limiter.schedule(async () => {
            // Creating promises for each container deletion
            const deletePromises = Array.from(toDeleteContainers).map(
              async (combinedId) => {
                const [accountId, containerId] = combinedId.split('-');

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                };

                try {
                  const response = await fetch(url, {
                    method: 'DELETE',
                    headers: headers,
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulDeletions.push(containerId);
                    toDeleteContainers.delete(containerId);
                    return { containerId, success: true };
                  } else {
                    parsedResponse = await response.json();
                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'container',
                      containerNames
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReachedContainers.push(containerId);
                      } else if (errorResult.errorCode === 404) {
                        notFoundLimit.push(containerId); // Track 404 errors
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for container ${containerNames}.`
                      );
                    }

                    toDeleteContainers.delete(containerId);
                    permissionDenied = errorResult ? true : permissionDenied;
                  }
                } catch (error: any) {
                  // Handling exceptions during fetch
                  errors.push(
                    `Error deleting container ${containerId}: ${error.message}`
                  );
                }
                toDeleteContainers.delete(containerId);
                return { containerId, success: false };
              }
            );

            // Awaiting all deletion promises
            await Promise.all(deletePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              message: `Data/permissions not found: ${notFoundLimit.map(
                (id) => id
              )}`,
              results: notFoundLimit.map((containerId) => ({
                id: [containerId], // Ensure id is an array
                name: [
                  containerNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by containerId or default to 'Unknown'
                success: false,
                notFound: true,
              })),
            };
          }
          if (featureLimitReachedContainers.length > 0) {
            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
                ', '
              )}`,
              results: featureLimitReachedContainers.map((containerId) => ({
                id: [containerId], // Ensure id is an array
                name: [
                  containerNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by containerId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          // Update tier limit usage as before (not shown in code snippet)
          if (successfulDeletions.length === selectedContainers.size) {
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
          console.warn('Rate limit exceeded. Retrying...');
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2;
          retries++;
        } else {
          console.error('An unexpected error occurred:', error);
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
      containers: successfulDeletions,
      errors: errors,
      results: successfulDeletions.map((containerId) => ({
        id: [containerId], // Ensure id is an array
        name: [containerNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array and provide a default value
        success: true,
      })),
      // Add a general message if needed
      message: errors.join(', '),
    };
  }
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitResponse.id },
      data: { deleteUsage: { increment: successfulDeletions.length } },
    });

    const cacheKey = `gtm:containers-userId:${userId}`;

    // Update the Redis cache
    await redis.del(cacheKey);
    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/containers`);
  }

  // Returning the result of the deletion process
  return {
    success: errors.length === 0,
    message: `Successfully deleted ${successfulDeletions.length} container(s)`,
    containers: successfulDeletions,
    errors: errors,
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map((containerId) => ({
      id: [containerId], // Ensure id is an array
      name: [containerNames.find((name) => name.includes(name)) || 'Unknown'], // Ensure name is an array
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateContainers(formData: FormCreateSchema) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReachedContainers: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  // Refactor: Use string identifiers in the set
  const toCreateContainers = new Set(
    formData.forms.map((cd) => `${cd.accountId}-${cd.containerName}`)
  );

  const tierLimitResponse: any = await tierCreateLimit(userId, 'GTMContainer');
  const limit = Number(tierLimitResponse.createLimit);
  const createUsage = Number(tierLimitResponse.createUsage);
  const availableCreateUsage = limit - createUsage;

  const creationResults: {
    containerName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Creating Containers',
      results: [],
    };
  }

  if (toCreateContainers.size > availableCreateUsage) {
    // If the creation request exceeds the available limit
    return {
      success: false,
      containers: [],
      message: `Cannot create ${toCreateContainers.size} containers as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      errors: [
        `Cannot create ${toCreateContainers.size} containers as it exceeds the available limit. You have ${availableCreateUsage} more creation(s) available.`,
      ],
      results: [],
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const containerNames = formData.forms.map((cd) => cd.containerName);

  if (toCreateContainers.size <= availableCreateUsage) {
    while (
      retries < MAX_RETRIES &&
      toCreateContainers.size > 0 &&
      !permissionDenied
    ) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const createPromises = Array.from(toCreateContainers).map(
              async (identifier) => {
                const [accountId, containerName] = identifier.split('-');
                const containerData = formData.forms.find(
                  (cd) =>
                    cd.accountId === accountId &&
                    cd.containerName === containerName
                );

                if (!containerData) {
                  errors.push(`Container data not found for ${identifier}`);
                  toCreateContainers.delete(identifier);
                  return;
                }

                const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/`;
                const headers = {
                  Authorization: `Bearer ${token[0].token}`,
                  'Content-Type': 'application/json',
                };

                try {
                  const formDataToValidate = { forms: [containerData] };

                  const validationResult =
                    CreateContainerSchema.safeParse(formDataToValidate);

                  if (!validationResult.success) {
                    let errorMessage = validationResult.error.issues
                      .map((issue) => `${issue.path[0]}: ${issue.message}`)
                      .join('. ');
                    errors.push(errorMessage);
                    toCreateContainers.delete(identifier);
                    return {
                      containerData,
                      success: false,
                      error: errorMessage,
                    };
                  }

                  // Accessing the validated container data
                  const validatedContainerData = validationResult.data.forms[0];

                  const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                      accountId: accountId,
                      name: containerName,
                      usageContext: validatedContainerData.usageContext,
                      domainName: validatedContainerData.domainName,
                      notes: validatedContainerData.notes,
                    }),
                  });

                  let parsedResponse;

                  if (response.ok) {
                    successfulCreations.push(containerName);
                    console.log('successfulCreations', successfulCreations);

                    toCreateContainers.delete(identifier);

                    creationResults.push({
                      containerName: containerName,
                      success: true,
                      message: `Successfully created container ${containerName}`,
                    });
                  } else {
                    parsedResponse = await response.json();

                    const errorResult = await handleApiResponseError(
                      response,
                      parsedResponse,
                      'container',
                      [containerName]
                    );

                    if (errorResult) {
                      errors.push(`${errorResult.message}`);
                      if (
                        errorResult.errorCode === 403 &&
                        parsedResponse.message === 'Feature limit reached'
                      ) {
                        featureLimitReachedContainers.push(containerName);
                      } else if (errorResult.errorCode === 404) {
                        const containerName =
                          containerNames.find((name) =>
                            name.includes(identifier.split('-')[1])
                          ) || 'Unknown';
                        notFoundLimit.push({
                          id: identifier.split('-')[1],
                          name: containerName,
                        });
                      }
                    } else {
                      errors.push(
                        `An unknown error occurred for container ${containerName}.`
                      );
                    }

                    toCreateContainers.delete(identifier);
                    permissionDenied = errorResult ? true : permissionDenied;
                    creationResults.push({
                      containerName: containerName,
                      success: false,
                      message: errorResult?.message,
                    });
                  }
                } catch (error: any) {
                  errors.push(
                    `Exception creating container ${containerName}: ${error.message}`
                  );
                  toCreateContainers.delete(identifier);
                  creationResults.push({
                    containerName: containerName,
                    success: false,
                    message: error.message,
                  });
                }
              }
            );

            await Promise.all(createPromises);
          });

          if (notFoundLimit.length > 0) {
            console.log('notFoundLimit', notFoundLimit);

            const notFoundNames = notFoundLimit
              .map((item) => item.name)
              .join(', ');
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              containers: [],
              message: `Data/permissions not found for containers: ${notFoundNames}`,

              results: notFoundLimit.map((item) => ({
                id: item.id,
                name: item.name,
                success: false,
                notFound: true,
              })),
            };
          }
          if (featureLimitReachedContainers.length > 0) {
            console.log(
              'featureLimitReachedContainers',
              featureLimitReachedContainers
            );

            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
                ', '
              )}`,
              results: featureLimitReachedContainers.map((containerId) => ({
                id: [containerId], // Ensure id is an array
                name: [
                  containerNames.find((name) => name.includes(name)) ||
                    'Unknown',
                ], // Ensure name is an array, match by containerId or default to 'Unknown'
                success: false,
                featureLimitReached: true,
              })),
            };
          }
          if (successfulCreations.length === formData.forms.length) {
            break;
          }

          if (toCreateContainers.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          console.warn('Rate limit exceeded. Retrying...');
          await new Promise((resolve) =>
            setTimeout(resolve, delay + Math.random() * 200)
          );
          delay *= 2;
          retries++;
        } else {
          console.error('An unexpected error occurred:', error);
          break;
        }
      }
    }
  }

  if (permissionDenied) {
    console.log('permissionDenied', permissionDenied);

    return {
      success: false,
      errors: errors,
      results: [],
      message: errors.join(', '),
    };
  }

  if (errors.length > 0) {
    console.log('errors', errors);
    return {
      success: false,
      containers: successfulCreations,
      errors: errors,
      results: successfulCreations.map((containerName) => ({
        containerName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulCreations.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitResponse.id },
      data: { createUsage: { increment: successfulCreations.length } },
    });

    const cacheKey = `gtm:containers-userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/containers`);
  }
  console.log('successfulCreations bottom', successfulCreations);

  // Map over formData.forms to create the results array
  const results: ContainerResult[] = formData.forms.map((form) => {
    // Ensure that form.containerId is defined before adding it to the array
    const containerId = form.containerId ? [form.containerId] : []; // Provide an empty array as a fallback
    return {
      id: containerId, // Ensure id is an array of strings
      name: [form.containerName], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    containers: [], // Populate with actual container IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers created successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function updateContainers(formData) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulCreations: string[] = [];
  const featureLimitReachedContainers: string[] = [];
  const notFoundLimit: string[] = [];

  // Refactor: Use string identifiers in the set
  const toupdateContainers = new Set(
    formData.forms.map((cd) => `${cd.accountId}-${cd.containerName}`)
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMContainer');

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for Updating Containers',
      results: [],
    };
  }

  while (retries < MAX_RETRIES && toupdateContainers.size > 0) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const updatePromises = Array.from(toupdateContainers).map(
            async (identifier: any) => {
              const [accountId, containerName] = identifier.split('-');
              const containerData = formData.forms.find(
                (cd) =>
                  cd.accountId === accountId &&
                  cd.containerName === containerName
              );

              if (!containerData) {
                errors.push(`Container data not found for ${identifier}`);
                toupdateContainers.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerData.containerId}`;
              const headers = {
                Authorization: `Bearer ${token[0].token}`,
                'Content-Type': 'application/json',
              };

              try {
                const formDataToValidate = { forms: [containerData] };

                const validationResult =
                  UpdateContainerSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toupdateContainers.delete(identifier);
                  return { containerData, success: false, error: errorMessage };
                }

                // Accessing the validated container data
                const validatedContainerData = validationResult.data.forms[0];

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: JSON.stringify({
                    accountId: accountId,
                    name: containerName,
                    usageContext: validatedContainerData.usageContext,
                    domainName: validatedContainerData.domainName,
                    notes: validatedContainerData.notes,
                  }),
                });

                const parsedResponse = await response.json();

                if (!response.ok) {
                  if (response.status === 404) {
                    // Handling 'not found' error
                    if (
                      parsedResponse.message ===
                      'Not found or permission denied'
                    ) {
                      notFoundLimit.push(containerName);
                      return {
                        success: false,
                        errorCode: 404,
                        message: 'Feature limit reached',
                      };
                    }
                    errors.push(
                      `Not found or permission denied for container ${containerName}`
                    );
                  } else if (response.status === 403) {
                    // Handling feature limit error
                    if (parsedResponse.message === 'Feature limit reached') {
                      featureLimitReachedContainers.push(containerName);
                      return {
                        success: false,
                        errorCode: 403,
                        message: 'Feature limit reached',
                      };
                    }
                  } else {
                    errors.push(
                      `Error ${response.status} for container ${containerName}: ${parsedResponse.message}`
                    );
                    toupdateContainers.delete(identifier);
                  }
                }

                if (response.ok) {
                  successfulCreations.push(containerName);
                  toupdateContainers.delete(identifier);
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating container ${containerName}: ${error.message}`
                );
                toupdateContainers.delete(identifier);
              }
            }
          );

          const results = await Promise.all(updatePromises);
          results.forEach((result) => {
            if (result && !result.success) {
              errors.push(
                `Failed to update container ${result}: ${result.error}`
              );
            }
          });

          if (featureLimitReachedContainers.length > 0) {
            throw new Error(
              `Feature limit reached for containers: ${featureLimitReachedContainers.join(
                ', '
              )}`
            );
          }
        });

        if (notFoundLimit.length > 0) {
          return {
            success: false,
            limitReached: true,
            message: `Data/permissions not found: ${notFoundLimit.join(', ')}`,
            results: notFoundLimit.map((cn) => ({
              containerName: cn,
              success: false,
              notFound: true,
            })),
          };
        }

        if (toupdateContainers.size === 0) {
          break;
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying...');
        await new Promise((resolve) =>
          setTimeout(resolve, delay + Math.random() * 200)
        );
        delay *= 2;
        retries++;
      } else {
        console.error('An unexpected error occurred:', error);
        break;
      }
    }
  }

  if (successfulCreations.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitResponse.id },
      data: { updateUsage: { increment: successfulCreations.length } },
    });

    const cacheKey = `gtm:containers-userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/containers`);
  }

  return {
    success: errors.length === 0,
    updatedContainers: successfulCreations,
    errors: errors,
    results: successfulCreations.map((containerName) => ({
      containerName,
      success: true,
    })),
  };
}

/************************************************************************************
  Combine containers
************************************************************************************/
/* export async function combineContainers(
  formData: FormUpdateSchema // Replace 'any' with the actual type if known
) {
  try {
    const { session } = useSession();

    const userId = session?.user?.id;

    const accessToken = await getAccessToken(userId);

    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Set<string>();
    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    const validationResult = UpdateContainerSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';

      validationResult.error.format();

      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();

      return {
        error: formattedErrorMessage,
      };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        containerName: formData.containerName,
        usageContext: formData.usageContext,
        accountId: formData.accountId,
        domainName: formData.domainName ? formData.domainName.split(',') : [''],
        notes: formData.notes,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const featureLimitReachedContainers: string[] = [];

    const updatePromises = forms.map(async (containerData) => {
      const {
        containerName,
        usageContext,
        accountId,
        domainName,
        notes,
        containerId,
      } = containerData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        containerName: containerName,
        usageContext: usageContext,
        accountId: accountId,
        notes: notes,
        containerId: containerId,
      };

      // Conditionally add domainName if it exists and is not empty
      if (domainName && domainName.length > 0 && domainName[0] !== '') {
        payload['domainName'] = domainName;
      }

      accountIdsToRevalidate.add(accountId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}`,
        {
          method: 'PUT',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const updateContainer = await response.json();

      if (response.status === 403) {
        if (updateContainer.message === 'Feature limit reached') {
          featureLimitReachedContainers.push(containerData.containerName);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to update container with name ${containerData.containerName} in account ${containerData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to update',
        };
      }

      return { success: true, updateContainer };
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReachedContainers.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      accountIdsToRevalidate.forEach((accountId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`
        );
      });
      return {
        success: true,
        limitReached: false,
        udpateContainers: results
          .filter((r) => r.success)
          .map((r) => r.updateContainer),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return {
      success: false,
      limitReached: false,
      message: error.message,
    };
  }
} */

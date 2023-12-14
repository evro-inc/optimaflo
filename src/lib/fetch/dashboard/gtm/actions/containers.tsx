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
import { DeleteContainersResponse } from '@/src/lib/types/types';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateContainerSchema>;

/************************************************************************************
  Function to list GTM containers
************************************************************************************/
export async function listGtmContainers(
  accessToken: string,
  accountId: string
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

        return data;
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
          listGtmContainers(accessToken, account.accountId)
        );

        // Get results for all accounts
        const containersResults = await Promise.all(containersPromises);

        // Combine containers from all accounts into one array
        const combinedContainers = containersResults.flat();

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
  accountId: string,
  selectedContainers: Set<string>
): Promise<DeleteContainersResponse> {
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
  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: {
        name: 'GTMContainer',
      },
      Subscription: {
        userId: userId,
      },
    },
    include: {
      Feature: true,
      Subscription: true,
    },
  });

  // Handling feature limit
  if (
    !tierLimitRecord ||
    tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
      results: [],
    };
  }

  // Retry loop for deletion requests
  while (retries < MAX_RETRIES && toDeleteContainers.size > 0) {
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
            async (containerId) => {
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

                const parsedResponse = await response.json();

                // Handling successful deletion
                if (response.ok) {
                  successfulDeletions.push(containerId);
                  return { containerId, success: true };
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
                  ) {
                    notFoundLimit.push(containerId);
                    return {
                      success: false,
                      errorCode: 404,
                      message: 'Feature limit reached',
                    };
                  }
                  errors.push(
                    `Not found or permission denied for container ${containerId}`
                  );
                } else if (response.status === 403) {
                  // Handling feature limit error
                  if (parsedResponse.message === 'Feature limit reached') {
                    featureLimitReachedContainers.push(containerId);
                    return {
                      success: false,
                      errorCode: 403,
                      message: 'Feature limit reached',
                    };
                  }
                } else {
                  // Handling other errors
                  errors.push(
                    `Error deleting container ${containerId}: ${response.status}`
                  );
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
          const results = await Promise.all(deletePromises);

          results.forEach((result) => {
            if (result.success && typeof result.containerId === 'string') {
              successfulDeletions.push(result.containerId);
            } else {
              // Handle the case where containerId is not a string or result is not successful
              errors.push(`Failed to delete container ${result.containerId}`);
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
            message: `Data/premissions not found: ${notFoundLimit.join(', ')}`,
            results: notFoundLimit.map((containerId) => ({
              containerId,
              success: false,
              notFound: true,
            })),
          };
        }

        // Update tier limit usage as before (not shown in code snippet)
        if (successfulDeletions.length === selectedContainers.size) {
          break; // Exit loop if all containers are processed successfully
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
  // If there are successful deletions, update the deleteUsage
  if (successfulDeletions.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitRecord.id },
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
    deletedContainers: successfulDeletions,
    errors: errors,
    results: successfulDeletions.map((containerId) => ({
      containerId,
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
  const notFoundLimit: string[] = [];

  // Refactor: Use string identifiers in the set
  const toCreateContainers = new Set(
    formData.forms.map((cd) => `${cd.accountId}-${cd.containerName}`)
  );

  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: { name: 'GTMContainer' },
      Subscription: { userId: userId },
    },
    include: { Feature: true, Subscription: true },
  });

  if (
    !tierLimitRecord ||
    tierLimitRecord.createUsage >= tierLimitRecord.createLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
    };
  }

  while (retries < MAX_RETRIES && toCreateContainers.size > 0) {
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
                console.log('validationResult', validationResult);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toCreateContainers.delete(identifier);
                  return { containerData, success: false, error: errorMessage };
                }

                // Accessing the validated container data
                const validatedContainerData = validationResult.data.forms[0];

                console.log('validatedContainerData', validatedContainerData);

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

                const parsedResponse = await response.json();

                if (response.ok) {
                  successfulCreations.push(containerName);
                  toCreateContainers.delete(identifier);
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
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
                  toCreateContainers.delete(identifier);
                }
              } catch (error: any) {
                errors.push(
                  `Exception creating container ${containerName}: ${error.message}`
                );
                toCreateContainers.delete(identifier);
              }
            }
          );

          const results = await Promise.all(createPromises);
          results.forEach((result) => {
            if (result && !result.success) {
              errors.push(
                `Failed to create container ${result}: ${result.error}`
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

  if (successfulCreations.length > 0) {
    await prisma.tierLimit.update({
      where: { id: tierLimitRecord.id },
      data: { createUsage: { increment: successfulCreations.length } },
    });

    const cacheKey = `gtm:containers-userId:${userId}`;

    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/containers`);
  }

  return {
    success: errors.length === 0,
    createdContainers: successfulCreations,
    errors: errors,
    results: successfulCreations.map((containerName) => ({
      containerName,
      success: true,
    })),
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

  const tierLimitRecord = await prisma.tierLimit.findFirst({
    where: {
      Feature: { name: 'GTMContainer' },
      Subscription: { userId: userId },
    },
    include: { Feature: true, Subscription: true },
  });

  if (
    !tierLimitRecord ||
    tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit
  ) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached',
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
                console.log('validationResult', validationResult);

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

                console.log('validatedContainerData', validatedContainerData);

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

                if (response.ok) {
                  successfulCreations.push(containerName);
                  toupdateContainers.delete(identifier);
                } else if (response.status === 404) {
                  // Handling 'not found' error
                  if (
                    parsedResponse.message === 'Not found or permission denied'
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
      where: { id: tierLimitRecord.id },
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

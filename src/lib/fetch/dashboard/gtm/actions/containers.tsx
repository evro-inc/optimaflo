'use server';
import { revalidatePath } from 'next/cache';
import { CreateContainerSchema } from '@/src/lib/schemas/containers';
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
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulDeletions: string[] = [];
  const featureLimitReachedContainers: string[] = [];
  const notFoundLimit: string[] = [];
  const toDeleteContainers = new Set(selectedContainers);

  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  // Authenticate and check for feature limit as you did before
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

  while (retries < MAX_RETRIES && toDeleteContainers.size > 0) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        await limiter.schedule(async () => {
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

                if (response.ok) {
                  successfulDeletions.push(containerId);
                  return { containerId, success: true };
                } else if (response.status === 404) {                
                    if (parsedResponse.message === 'Not found or permission denied') {
                      notFoundLimit.push(containerId);
                      return {
                        success: false,
                        errorCode: 403,
                        message: 'Feature limit reached',
                      };
                    }
                  errors.push(
                    `Not found or permission denied for container ${containerId}`
                  );
                } else if (response.status === 403) {
                    if (parsedResponse.message === 'Feature limit reached') {
                      featureLimitReachedContainers.push(containerId);
                      return {
                        success: false,
                        errorCode: 403,
                        message: 'Feature limit reached',
                      };
                    }
                } else {
                  errors.push(
                    `Error deleting container ${containerId}: ${response.status}`
                  );
                }
              } catch (error: any) {
                errors.push(
                  `Error deleting container ${containerId}: ${error.message}`
                );
              }
              toDeleteContainers.delete(containerId); // Remove from the retry set regardless of success or failure
              return { containerId, success: false };
            }
          );

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
            message: `Data/premissions not found: ${notFoundLimit.join(
              ', '
            )}`,
            results: notFoundLimit.map(containerId => ({
              containerId,
              success: false,
              notFound: true
            })),
          };
        }

        // Update tier limit usage as before

        if (successfulDeletions.length === selectedContainers.size) {
          break; // Exit loop if all containers are processed successfully
        }
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
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
  }
  if (successfulDeletions.length > 0) {
    const cacheKey = `gtm:containers-userId:${userId}`;
    const cachedContainersString = await redis.get(cacheKey);
    let cachedContainers = cachedContainersString
      ? JSON.parse(cachedContainersString)
      : [];

    // Filter out the successfully deleted containers
    cachedContainers = cachedContainers.filter(
      (container) => !successfulDeletions.includes(container.containerId)
    );

    // Update the Redis cache
    await redis.set(
      cacheKey,
      JSON.stringify(cachedContainers),
      'EX',
      60 * 60 * 2 // Cache expiration time
    );

    // Revalidate paths if needed
    revalidatePath(`/dashboard/gtm/containers`);
  }

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
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  let accountIdsToRevalidate = new Set<string>();
  const forms: any[] = [];

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

  while (retries < MAX_RETRIES) {
    try {
      // Wait for the rate limit to be available
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        await limiter.schedule(async () => {
          const plainDataArray = formData.forms.map((fd) => {
            return Object.fromEntries(
              Object.keys(fd).map((key) => [key, fd[key]])
            );
          });

          // Now pass plainDataArray to CreateContainerSchema.safeParse within an object under the key 'forms'
          const validationResult = CreateContainerSchema.safeParse({
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
              domainName: formData.domainName
                ? formData.domainName.split(',')
                : [''],
              notes: formData.notes,
            });
          });

          const requestHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          };

          const featureLimitReachedContainers: string[] = [];

          const createPromises = forms.map(async (containerData) => {
            const {
              containerName,
              usageContext,
              accountId,
              domainName,
              notes,
            } = containerData; // Destructure from the current object

            // Initialize payload with a flexible type
            const payload: { [key: string]: any } = {
              name: containerName,
              usageContext: usageContext,
              accountId: accountId,
              notes: notes,
            };

            // Conditionally add domainName if it exists and is not empty
            if (domainName && domainName.length > 0 && domainName[0] !== '') {
              payload['domainName'] = domainName;
            }

            accountIdsToRevalidate.add(accountId);
            const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/`;

            const response = await fetch(url, {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify(payload),
            });

            const createdContainer = await response.json();

            if (response.status === 403) {
              if (createdContainer.message === 'Feature limit reached') {
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
                `Failed to create container with name ${containerData.containerName} in account ${containerData.accountId}: ${response.status}`
              );

              return {
                success: false,
                errorCode: response.status,
                message: 'Failed to create',
              };
            }

            return { success: true, createdContainer };
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              createUsage: {
                increment: 1,
              },
            },
          });

          const results = await Promise.all(createPromises);

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
            const token = await currentUserOauthAccessToken(userId);
            const cacheKey = `gtm:containers-userId:${userId}`;
            await redis.del(cacheKey);

            // Optionally, fetch and cache the updated list of workspaces
            const updatedContainers = await listAllGtmContainers(
              token[0].token
            ); // A function to fetch all workspaces
            await redis.set(
              cacheKey,
              JSON.stringify(updatedContainers),
              'EX',
              60 * 60 * 24 * 7
            );

            /* const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?  */

            const path = `/dashboard/gtm/containers`;

            revalidatePath(path);
            return {
              success: true,
              limitReached: false,
              createdContainers: results
                .filter((r) => r.success)
                .map((r) => r.createdContainer),
            };
          }
        });
      }
    } catch (error: any) {
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

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
/* export async function updateContainers(
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

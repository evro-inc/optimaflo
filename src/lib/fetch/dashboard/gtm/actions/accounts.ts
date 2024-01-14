'use server'; // Indicates that this file should only be used in a server environment

// Importing necessary modules and functions
import { auth } from '@clerk/nextjs'; // Importing authentication function from Clerk
import { limiter } from '../../../../bottleneck'; // Importing rate limiter configuration
import { gtmRateLimit } from '../../../../redis/rateLimits'; // Importing rate limiting utility for Google Tag Manager
import { UpdateAccountSchema } from '../../../../schemas/accounts'; // Importing schema for account updates
import { z } from 'zod'; // Importing Zod for schema validation
import { revalidatePath } from 'next/cache'; // Importing function to revalidate cached paths in Next.js
import { currentUserOauthAccessToken } from '@/src/lib/clerk'; // Importing function to get the current user's OAuth access token
import { redis } from '@/src/lib/redis/cache'; // Importing Redis cache instance
import { notFound } from 'next/navigation'; // Importing utility for handling 'not found' navigation in Next.js
import { handleApiResponseError } from '@/src/lib/helpers/server';

// Defining a type for form update schema using Zod
type FormUpdateSchema = z.infer<typeof UpdateAccountSchema>;

/************************************************************************************
 * List All Google Tag Manager Accounts
 ************************************************************************************/
export async function listGtmAccounts() {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);
  const accessToken = token[0].token;

  const cacheKey = `gtm:accounts:userId:${userId}`;

  const cachedValue = await redis.get(cacheKey);

  if (cachedValue) {
    return JSON.parse(cachedValue);
  }

  // Loop for retry mechanism
  while (retries < MAX_RETRIES) {
    try {
      // Enforcing rate limit for the user
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        let data;
        // Scheduling the API call with a rate limiter
        await limiter.schedule(async () => {
          // Setting up the API call
          const url = `https://www.googleapis.com/tagmanager/v2/accounts`;
          const headers = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          };

          // Making the API call
          const response = await fetch(url, { headers });

          // Handling non-OK responses by throwing an error
          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}. ${response.statusText}`
            );
          }
          // Parsing the response body
          const responseBody = await response.json();
          data = responseBody.account;
        });

        // Caching the data in Redis with a 2 hour expiration time
        redis.set(
          cacheKey,
          JSON.stringify(data),
          'EX',
          60 * 60 * 2
        );
        return data;
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
  // Throwing an error if maximum retries are reached
  throw new Error('Maximum retries reached without a successful response.');
}

/************************************************************************************
 * Update Google Tag Manager Accounts
 ************************************************************************************/
export async function updateAccounts(
  formData: FormUpdateSchema // Form data conforming to the update account schema
) {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const cacheKey = `gtm:accounts:userId:${userId}`;


  // Getting the current user's OAuth access token
  const token = await currentUserOauthAccessToken(userId);

  // Not including tier limits on accounts for now

  // Initializing arrays for promises and tracking feature limits
  let updatePromises: Promise<any>[] = [];
  let featureLimitReached: string[] = [];

  // Retry loop
  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );
      if (remaining > 0) {
        // Base URL and error tracking
        const errors: string[] = [];
        const forms: any[] = [];

        // Scheduling the API call with a rate limiter
        await limiter.schedule(async () => {
          // Transforming and validating form data
          const plainDataArray = formData.forms.map((fd) => {
            return Object.fromEntries(
              Object.keys(fd).map((key) => [key, fd[key]])
            );
          });

          const validationResult = UpdateAccountSchema.safeParse({
            forms: plainDataArray,
          });

          // Handling validation errors
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
            return { error: formattedErrorMessage };
          }

          // Adding valid forms to the 'forms' array
          validationResult.data.forms.forEach((form) => {
            forms.push(form);
          });

          // Creating promises for each form update
          updatePromises = forms.map(async (form) => {
            const url = `https://www.googleapis.com/tagmanager/v2/accounts/${form.accountId}`;
            const headers = {
              Authorization: `Bearer ${token[0].token}`,
              'Content-Type': 'application/json',
            };

            const payload = {
              accountId: form.accountId,
              name: form.name,
            };
            // Performing the PUT request for each form
            const response = await fetch(url, {
              method: 'PUT',
              body: JSON.stringify(payload),
              headers: headers,
            });

            const parsedResponse = await response.json();

            if (!response.ok) {
              if (response.status === 404) {
                // Return an object indicating this account was not found
                return { accountId: form.accountId, notFound: true };
              } else {
                // Handle other errors
                const errorResponse: any = await handleApiResponseError(
                  response,
                  parsedResponse,
                  'Account',
                  form.accountId
                );
                errors.push(errorResponse.message);
                return { accountId: form.accountId, error: true };
              }
            } else {
              return { ...parsedResponse, success: true };
            }
          });
        });

        // Awaiting all update promises
        const results = await Promise.all(updatePromises);
        const notFoundIds = results
          .filter((result) => result && result.notFound)
          .map((result) => result.accountId);
        const successfulUpdates = results.filter(
          (result) => result && result.success
        );

        // Handling cases where feature limits are reached
        if (featureLimitReached.length > 0) {
          return {
            success: false,
            limitReached: true,
            message: `Feature limit reached for workspaces: ${featureLimitReached.join(
              ', '
            )}`,
          };
        } else if (notFoundIds.length > 0) {
          return {
            success: false,
            notFoundError: true,
            notFoundIds: notFoundIds,
            updatedAccounts: successfulUpdates.map((update) => ({
              accountId: update.accountId,
              name: update.name,
            })),
            message: `Account(s) not found: ${notFoundIds.join(', ')}`,
          };
        }

        // Handling cases where other errors occurred
        else if (errors.length > 0) {
          return {
            success: false,
            limitReached: false,
            notFoundError: true,
            message: errors.join(', '),
          };
        } else {
          // Fetching and caching updated accounts if successful
          await redis.del(cacheKey);

          // Optionally fetching and caching the updated list of workspaces
          const updatedAccounts = await listGtmAccounts();
          await redis.set(
            cacheKey,
            JSON.stringify(updatedAccounts),
            'EX',
            60 * 60 * 2
          );

          // Revalidating the path to update the cached data
          const path = `/dashboard/gtm/accounts`;
          revalidatePath(path);

          // Returning success with the updated workspaces
          return {
            success: true,
            limitReached: false,
            updatedAccounts: successfulUpdates.map((update) => ({
              accountId: update.accountId,
              name: update.name,
            })),
          };
        }
      }
    } catch (error: any) {
      // Handling rate limit exceeded error
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get accounts...');
        // Adding jitter to delay and retry
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        // Throwing other types of errors
        throw error;
      }
    }
  }
}

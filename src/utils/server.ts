/* global RequestInit */

'use server';

import { notFound } from 'next/navigation';
import prisma from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redis } from '../lib/redis/cache';
import { fetchGASettings, fetchGtmSettings } from '../lib/fetch/dashboard';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { gtmRateLimit } from '../lib/redis/rateLimits';
import { limiter } from '../lib/bottleneck';

// Define the type for the pagination and filtering result
type PaginatedFilteredResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const tierDeleteLimit = async (userId: string, featureName: string) => {
  try {
    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: featureName,
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
    if (!tierLimitRecord || tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit) {
      return {
        success: false,
        limitReached: true,
        message: 'Feature limit reached',
        results: [],
      };
    }

    // Return the tierLimitRecord object
    return tierLimitRecord;
  } catch (error) {
    // Handle the error or return an appropriate response
    return {
      success: false,
      limitReached: true,
      message: `An error occurred: ${error}`,
      results: [],
    };
  }
};

export const tierCreateLimit = async (userId: string, featureName: string) => {
  try {
    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: featureName,
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
    if (!tierLimitRecord || tierLimitRecord.createUsage >= tierLimitRecord.createLimit) {
      return {
        success: false,
        limitReached: true,
        message: 'Feature limit reached',
        results: [],
      };
    }

    // Return the tierLimitRecord object
    return tierLimitRecord;
  } catch (error) {
    // Handle the error or return an appropriate response
    return {
      success: false,
      limitReached: true,
      message: `An error occurred: ${error}`,
      results: [],
    };
  }
};

export const tierUpdateLimit = async (userId: string, featureName: string) => {
  try {
    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: featureName,
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
    if (!tierLimitRecord || tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit) {
      return {
        success: false,
        limitReached: true,
        message: 'Feature limit reached',
        results: [],
      };
    }

    // Return the tierLimitRecord object
    return tierLimitRecord;
  } catch (error) {
    // Handle the error or return an appropriate response
    return {
      success: false,
      limitReached: true,
      message: `An error occurred: ${error}`,
      results: [],
    };
  }
};

// Function to Handle API Errors
export async function handleApiResponseError(response: Response, feature: string, names: string[]) {
  // Parse the response body if not already parsed
  const parsedResponse = await response.json().catch(() => null);

  switch (response.status) {
    case 400:
      if (feature == 'versions') {
        return {
          success: false,
          errorCode: 400,
          message: `${feature} ${names} was unsuccessful. Make sure you're not deleting the latest or live version of your container.`,
        };
      }

      return {
        success: false,
        errorCode: 400,
        message: `${feature} ${names} was unsuccessful. ${
          parsedResponse?.error?.message ?? 'Unknown error'
        }`,
      };

    case 404:
      return {
        success: false,
        errorCode: 404,
        LimitReached: false,
        message: `Permission denied for ${feature}. Check if you have ${feature} permissions or refresh the data for ${names}.`,
      };

    case 403:
      if (parsedResponse?.message === 'Feature limit reached') {
        return {
          success: false,
          errorCode: 403,
          message: 'Feature limit reached',
        };
      } else {
        return {
          success: false,
          errorCode: response.status,
          message: parsedResponse?.error?.message ?? 'Unknown error',
        };
      }

    case 409:
      return {
        success: false,
        errorCode: 409,
        message: `The ${feature} already exists. Please try again.`,
      };

    case 429:
      return {
        success: false,
        errorCode: 429,
        message: 'Rate limit exceeded. Please try again later.',
      };

    default:
      return {
        success: false,
        errorCode: response.status,
        message: `Error with status: ${response.status}`,
      };
  }
}

export async function fetchFilteredRows<T>(
  allItems: T[],
  query: string,
  currentPage: number,
  pageSize: number = 10
): Promise<PaginatedFilteredResult<T>> {
  const { userId } = auth();
  if (!userId) return notFound();

  let filteredItems;
  if (query) {
    // Filter items if query is not empty
    filteredItems = allItems.filter(
      (item: any) =>
        item.name &&
        typeof item.name === 'string' &&
        item.name.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    // If query is empty, use all items
    filteredItems = allItems;
  }

  // Calculate pagination values
  const total = filteredItems.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Paginate the filtered items
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  return {
    data: paginatedItems,
    total: total,
    page: currentPage,
    pageSize: pageSize,
  };
}

export async function fetchAllFilteredRows<T>(allItems: T[], query: string): Promise<T[]> {
  const { userId } = auth();
  if (!userId) return notFound();

  let filteredItems;
  if (query) {
    filteredItems = allItems.filter(
      (item: any) =>
        item.name &&
        typeof item.name === 'string' &&
        item.name.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    filteredItems = allItems;
  }

  return filteredItems;
}

export async function fetchPages<T>(
  allItems: T[],
  query: string,
  pageSize: number
): Promise<number> {
  const { userId } = auth();
  if (!userId) return notFound();

  let filtered;
  if (query) {
    filtered = allItems.filter(
      (item: any) => 'name' in item && item.name.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    filtered = allItems;
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  return totalPages;
}

/*************************************************************************
 * Global Hard Refresh Cache
 *************************************************************************/
export async function revalidateHardCacheGlobal(keys: string[], path: string, userId: string) {
  try {
    const pipeline = redis.pipeline();

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      notFound();
    }

    await fetchGtmSettings(userId);
    await fetchGASettings(userId);

    keys.forEach((key) => pipeline.del(key));

    await pipeline.exec(); // Execute all queued commands in a batch
    await revalidatePath(path);
  } catch (error) {
    console.error('Error during revalidation:', error);
    throw new Error('Revalidation failed');
  }
}

/*************************************************************************
 * Local Hard Refresh Cache
 *************************************************************************/
export async function hardRevalidateFeatureCache(
  keys: string[], // Redis keys for cache entries
  path: string, // The path to revalidate
  userId: string // User ID
) {
  try {
    const pipeline = redis.pipeline();

    // Fetch the user (ensure user exists)
    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      notFound();
    }

    // Iterate over each key and delete the entire key (set, hash, etc.)
    keys.forEach((key) => {
      //console.log(`Deleting Redis key: ${key}`);
      pipeline.del(key); // Delete the entire Redis key
    });

    // Execute the pipeline commands
    await pipeline.exec(); // Delete all keys in one batch

    // Trigger Incremental Static Regeneration (ISR) to revalidate the path
    await revalidatePath(path);
  } catch (error) {
    console.error('Error during hard revalidation:', error);
    throw new Error('Revalidation failed');
  }
}

/*************************************************************************
 * Local Soft Refresh Cache
 *************************************************************************/
export async function softRevalidateFeatureCache(
  keys: string[], // Redis keys for cache entries
  path: string, // The path to revalidate
  userId: string, // User ID
  operations: {
    crudType: 'update' | 'create' | 'delete';
    data: any;
  }[], // Array of operations with dynamic URL paths
  cacheField
) {
  try {
    const pipeline = redis.pipeline();

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      notFound();
    }

    // Fetch current cache data for each key (using HGETALL for hash data)
    const cacheDataArray = await Promise.all(keys.map((key) => redis.hgetall(key)));

    keys.forEach((key, index) => {
      const cacheData = cacheDataArray[index];

      operations.forEach((operation) => {
        const { crudType, data } = operation;

        switch (crudType) {
          case 'delete':
            if (Object.keys(cacheData).length > 0) {
              // If cache exists, remove specific entry
              pipeline.hdel(key, cacheField); // Remove the specific entry
            } else {
              pipeline.del(key); // Remove the entire cache if no data found
            }
            break;

          case 'update':
          case 'create':
            // Add or update property in cache
            pipeline.hset(key, cacheField, JSON.stringify(data)); // Use HSET to update or create field
            break;

          default:
            console.warn(`Unknown operation type: ${crudType}`);
        }
      });
    });

    // Execute the Redis pipeline
    await pipeline.exec();

    // Trigger ISR to revalidate the path
    await revalidatePath(path);
  } catch (error) {
    console.error('Error during revalidation:', error);
    throw new Error('Revalidation failed');
  }
}

export async function revalidate(
  currentData: string[], // List of property names to delete from Redis
  keys: string[] | string, // Redis keys for cache entries (handle both string and array)
  path: string, // The path to revalidate
  userId: string, // User ID
  global: boolean = false // Global flag
) {
  try {
    // Ensure 'keys' is an array
    const keysArray = Array.isArray(keys) ? keys : [keys];

    const pipeline = redis.pipeline();

    const user = await prisma.user.findFirst({
      where: { id: userId },
    });

    if (!user) {
      notFound();
    }

    if (global) {
      await fetchGtmSettings(userId);
      await fetchGASettings(userId);
    }

    // Fetch all necessary cache data in one go
    const cacheDataArray = await Promise.all(keysArray.map((key) => redis.get(key)));

    keysArray.forEach((key, index) => {
      const cacheData = cacheDataArray[index];
      if (cacheData) {
        const parsedData = JSON.parse(cacheData);

        // Filter out deleted properties from the parsed cache data
        const updatedData = parsedData.filter((item: any) => !currentData.includes(item.name));

        // Update the cache with the new data that no longer includes the deleted properties
        pipeline.set(key, JSON.stringify(updatedData), 'EX', 86400); // Cache for 24 hours
      } else if (global) {
        // Clear the cache if global flag is true and no cache data found
        pipeline.del(key);
      }
    });

    await pipeline.exec(); // Execute all queued commands in a batch
    await revalidatePath(path); // Trigger ISR to revalidate the path
  } catch (error) {
    console.error('Error during revalidation:', error);
    throw new Error('Revalidation failed');
  }
}

export const fetchWithRetry = async (url: string, headers: any, retries = 0): Promise<any> => {
  const MAX_RETRIES = 20;
  const INITIAL_DELAY = 1500;
  let delay = INITIAL_DELAY;

  try {
    const response = await fetch(url, { headers });
    if (response.status === 429 && retries < MAX_RETRIES) {
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay = Math.min(delay * 2, 30000); // Cap delay at 16 seconds
      return fetchWithRetry(url, retries + 1);
    } else if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (retries < MAX_RETRIES) {
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay = Math.min(delay * 2, 30000); // Cap delay at 16 seconds
      return fetchWithRetry(url, retries + 1);
    } else {
      throw error;
    }
  }
};

/************************************************************************************
  API Helper Functions for Modularity and Reusability
************************************************************************************/

/** Authenticates the user and returns userId or throws a notFound error */
export async function authenticateUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw notFound();
  return userId;
}

/** Retrieves the OAuth access token for the user */
export async function getOauthToken(userId: string): Promise<string> {
  return await currentUserOauthAccessToken(userId);
}

/** Ensures rate limit is respected with retries */
export async function ensureGARateLimit(userId: string): Promise<void> {
  const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
  if (remaining <= 0) throw new Error('Rate limit exceeded');
}

/** Checks if a feature limit is reached and returns available usage */
export async function checkFeatureLimit(
  userId: string,
  feature: string,
  limitType: 'create' | 'delete' | 'update'
): Promise<{ tierLimitResponse: any; availableUsage: number }> {
  let tierLimitResponse;
  if (limitType === 'create') {
    tierLimitResponse = await tierCreateLimit(userId, feature);
  } else if (limitType === 'delete') {
    tierLimitResponse = await tierDeleteLimit(userId, feature);
  } else {
    tierLimitResponse = await tierUpdateLimit(userId, feature);
  }

  const limit = Number(tierLimitResponse[`${limitType}Limit`]);
  const usage = Number(tierLimitResponse[`${limitType}Usage`]);
  const availableUsage = limit - usage;

  return { tierLimitResponse, availableUsage };
}

/** Executes an API request with retry logic */
export async function executeApiRequest(
  url: string,
  options: RequestInit,
  feature: string = '',
  names: string[] = [],
  maxRetries = 5
): Promise<any> {
  let retries = 0;
  let delay = 1000;

  while (retries < maxRetries) {
    try {
      const response = await limiter.schedule(() => fetch(url, options));
      console.log('response log', response);

      // Parse the response once and store it
      const responseData = await response.json();

      console.log('response data', responseData);

      if (response.ok) {
        return responseData; // Use the parsed data here
      }

      if (response.status === 429) {
        await handleRateLimitRetry(retries, delay);
        delay *= 2;
      } else {
        const error = await handleApiResponseError(response, feature, names); // Pass all required arguments
        throw error;
      }
    } catch (error: any) {
      if (retries >= maxRetries - 1) throw error;
      retries++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error('Maximum retries reached without a successful response.');
}

/** Handles rate limit retry logic */
export async function handleRateLimitRetry(retries: number, delay: number): Promise<void> {
  if (retries < 3) {
    const jitter = Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay + jitter));
  } else {
    throw new Error('Rate limit exceeded');
  }
}

/** Validates form data using a schema */
export async function validateFormData(schema: any, formData: any): Promise<any> {
  const validationResult = schema.safeParse(formData);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues
      .map((issue) => `${issue.path[0]}: ${issue.message}`)
      .join('. ');
    throw new Error(errorMessage);
  }
  return validationResult.data;
}

/* MISC */

// src/utils/server/server-utils.ts

/**
 * Server-side function to map accounts to their corresponding properties.
 * This function does not rely on React hooks and can be used in server-side logic.
 */
export async function getAccountsWithProperties(accounts: any[], properties: any[]) {
  // Flatten all properties arrays into a single array of properties
  const allProperties = properties.flatMap((propertyGroup) => propertyGroup.properties || []);

  // Map accounts and attach properties that belong to each account
  const mappedAccounts = accounts
    .map((account) => ({
      ...account,
      properties: allProperties.filter((property) => property.parent === account.name),
    }))
    .filter((account) => account.properties.length > 0); // Filter out accounts with no properties

  return mappedAccounts;
}

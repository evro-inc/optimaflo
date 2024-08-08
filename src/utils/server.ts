'use server';
import { notFound } from 'next/navigation';
import prisma from '../lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redis } from '../lib/redis/cache';
import { fetchGASettings, fetchGtmSettings } from '../lib/fetch/dashboard';

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
export async function handleApiResponseError(
  response: Response,
  parsedResponse: any,
  feature: string,
  names: string[]
) {
  switch (response.status) {
    case 400:
      return {
        success: false,
        errorCode: 400,
        message: `${feature} ${names} was not created. ${parsedResponse.error.message}`,
      };

    case 404:
      return {
        success: false,
        errorCode: 404,
        LimitReached: false,
        message: `Permission denied for ${feature}. Check if you have ${feature} permissions or refresh the data for ${names}.`,
      };

    case 403:
      if (parsedResponse.message === 'Feature limit reached') {
        return {
          success: false,
          errorCode: 403,
          message: 'Feature limit reached',
        };
      } else {
        return {
          success: false,
          errorCode: response.status,
          message: parsedResponse.error.message,
        };
      }
      break;

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
        message: `Error deleting container: ${response.status}`,
      };
  }
  return null;
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

export async function revalidate(keys: string[], path: string, userId: string) {
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

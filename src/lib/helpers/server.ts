'use server';
import logger from '../logger';
import prisma from '../prisma';

export const getURL = () => {
  let vercelUrl = process.env.VERCEL_URL; // Assign VERCEL_URL to vercelUrl

  // Check if we're running locally or in Vercel's environment
  if (typeof vercelUrl === 'undefined' || vercelUrl.startsWith('localhost')) {
    // For local development, use the local server URL
    vercelUrl = 'http://localhost:3000'; // Adjust if your local server uses a different port
  } else {
    // Ensure the URL uses https if deployed on Vercel
    vercelUrl = `https://${vercelUrl}`;
  }

  if (!vercelUrl) {
    throw new Error('Could not determine URL. VERCEL_URL is undefined');
  }

  return vercelUrl;
};

export const postData = async ({ url, data }: { url: string; data?: any }) => {
  const res: Response = await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'same-origin',
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    logger.error('Error in postData', { url, data, res });

    throw Error(res.statusText);
  }

  return res.json();
};

export const toDateTime = (secs: number) => {
  var t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export const handleRefreshCache = async (router, key, path) => {
  try {
    const response = await fetch('/api/dashboard/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        path,
      }),
    });

    console.log('response', response);

    await response.json();
    router.refresh();
  } catch (error) {
    console.error('Error refreshing cache:', error);
  }
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
  } catch (error) {
    console.error('Error in tierLimits:', error);
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
    if (
      !tierLimitRecord ||
      tierLimitRecord.createUsage >= tierLimitRecord.createLimit
    ) {
      return {
        success: false,
        limitReached: true,
        message: 'Feature limit reached',
        results: [],
      };
    }
  } catch (error) {
    console.error('Error in tierLimits:', error);
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

    console.log('tierLimitRecord update', tierLimitRecord);
    
    // Handling feature limit
    if (
      !tierLimitRecord ||
      tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit
    ) {
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
    console.error('Error in tierLimits:', error);
    // Handle the error or return an appropriate response
    return {
      success: false,
      limitReached: true,
      message: 'An error occurred',
      results: [],
    };
  }
};

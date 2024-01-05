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

    console.log('tierLimitRecord create', tierLimitRecord);

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

// Function to Handle API Errors
export async function handleApiResponseError(
  response: Response,
  parsedResponse: any,
  feature: string
) {
  switch (response.status) {
    case 400:
      if (
        parsedResponse.error &&
        parsedResponse.error.message.includes(
          'Returned an error response for your request'
        )
      ) {
        return {
          success: false,
          errorCode: 400,
          message: `${feature} was not created. Please try again. Make sure you're not creating a duplicate ${feature}.`,
        };
      }
      return {
        success: false,
        errorCode: 400,
        message: 'Unknown error occurred',
      };

    case 404:
      return {
        success: false,
        errorCode: 404,
        LimitReached: false,
        message:
          `Permission denied for ${feature}. Check if you have ${feature} permissions or refresh the data.`,
      };

    case 403:
      if (parsedResponse.message === 'Feature limit reached') {
        return {
          success: false,
          errorCode: 403,
          message: 'Feature limit reached',
        };
      }
      break;

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

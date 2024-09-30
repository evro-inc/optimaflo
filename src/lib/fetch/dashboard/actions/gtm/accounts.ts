'use server';

import { FormSchema, FormSchemaType } from '../../../../schemas/gtm/accounts';
import { redis } from '@/src/lib/redis/cache';
import { authenticateUser, checkFeatureLimit, ensureGARateLimit, executeApiRequest, getOauthToken, softRevalidateFeatureCache, validateFormData } from '@/src/utils/server';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/types/types';

const featureType: string = 'GA4Accounts';

/************************************************************************************
 * List All Google Tag Manager Accounts
 ************************************************************************************/
export async function listGtmAccounts(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:accounts:userId:${userId}`;

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
    include: { ga: true },
  });

  if (!data) return [];

  await ensureGARateLimit(userId);

  const url = `https://www.googleapis.com/tagmanager/v2/accounts?fields=account(accountId,name)`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    const response = await executeApiRequest(url, { headers });
    const accountsData = response.account || [];

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      accountsData.forEach((property: any) => {
        const fieldKey = property.accountId; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(property));
        } else {
          console.warn('Skipping property with undefined name:', property);
        }
      });

      pipeline.expire(cacheKey, 86400); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return accountsData; // Return only the properties array
  } catch (apiError) {
    console.error('Error fetching properties from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}



/* export async function listGtmAccounts(skipCache = false) {
  // Initialization of retry mechanism
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  // If user ID is not found, return a 'not found' error
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const cacheKey = `gtm:accounts:userId:${userId}`;

  if (skipCache == false) {
    const cachedValue = await redis.get(cacheKey);

    if (cachedValue) {
      return JSON.parse(cachedValue);
    }
  }

  // Loop for retry mechanism
  while (retries < MAX_RETRIES) {
    try {
      // Enforcing rate limit for the user
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let data;
        // Scheduling the API call with a rate limiter
        await limiter.schedule(async () => {
          // Setting up the API call
          const url = `https://www.googleapis.com/tagmanager/v2/accounts?fields=account(accountId,name)`;
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Making the API call
          const response = await fetch(url, { headers });

          // Handling non-OK responses by throwing an error
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
          }
          // Parsing the response body
          const responseBody = await response.json();
          data = responseBody.account;
        });

        // Caching the data in Redis with a 2 hour expiration time
        redis.set(cacheKey, JSON.stringify(data), 'EX', 60 * 60 * 2);
        return data;
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      // Handling rate limit exceeded error
      if (error.code === 429 || error.status === 429) {
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
} */


/************************************************************************************
 * Update Google Tag Manager Accounts
 ************************************************************************************/
export async function updateAccounts(formData: {
  forms: FormSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'update'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available updates.',
      errors: [
        `Cannot update more accounts than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];
  let successfulUpdates: any[] = [];

  await ensureGARateLimit(userId);

  console.log("formData", formData);


  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      console.log("val data", validatedData);


      const cleanedData = validatedData.forms[0];
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${cleanedData.accountId}`;

      console.log('url', url);
      console.log('cleanedData', cleanedData);


      const requestBody: any = {
        accountId: cleanedData.accountId,
        name: cleanedData.name,
      };

      try {
        const res = await executeApiRequest(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify(requestBody),
        });

        console.log('res tt', res);

        successfulUpdates.push(res);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { updateUsage: { increment: 1 } },
        });

        // Immediate revalidation per each update is not needed, aggregate revalidation is better
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(validatedData.forms[0].name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({
            id: validatedData.forms[0].parent,
            name: validatedData.forms[0].name,
          });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Updates**:
  if (successfulUpdates.length > 0) {
    try {
      // Only revalidate the affected properties
      const operations = successfulUpdates.map((update) => ({
        crudType: 'update' as const, // Explicitly set the type as "update"
        ...update,
      }));

      const cacheFields = successfulUpdates.map((update) => update);
      const cacheFieldPaths = cacheFields.map((update) => update.accountId);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`gtm:accounts:userId:${userId}`],
        `/dashboard/gtm/entities`,
        userId,
        operations,
        cacheFieldPaths
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
      message: `Some metrics could not be found: ${notFoundLimit
        .map((item) => item.name)
        .join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [], // Ensure id is an array and filter out undefined
        name: [item.name], // Ensure name is an array to match FeatureResult type
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
      message: `Feature limit reached for metrics: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((propertyName) => ({
        id: [], // Populate with actual property IDs if available
        name: [propertyName], // Wrap the string in an array
        success: false,
        featureLimitReached: true,
      })),
    };
  }

  // Handle general errors
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
    message: `Successfully updated ${successfulUpdates.length} metric(s)`,
    features: successfulUpdates.map<FeatureResult>((d) => ({
      id: [d.name], // Populate with actual property IDs if available
      name: [d.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((d) => ({
      id: [d.name], // Populate this with actual property IDs if available
      name: [d.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
  };
}
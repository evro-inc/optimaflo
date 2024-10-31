'use server';

import { redis } from '@/src/lib/redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureRateLimits,
  executeApiRequest,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { FormSchemaType, FormSchema, PropertySchema } from '@/src/lib/schemas/ga/properties';
import { z } from 'zod';

const featureType: string = 'GA4Properties';

/************************************************************************************
  Function to list GA properties
************************************************************************************/
export async function listGAProperties(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:properties:userId:${userId}`;

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

  try {
    await ensureRateLimits(userId);
  } catch (error: any) {
    // Log the error and return an empty array or handle it gracefully
    console.error('Rate limit exceeded:', error.message);
    return []; // Return an empty array to match the expected type
  }

  const uniqueAccountIds = Array.from(new Set(data.ga.map((item) => item.accountId)));
  const urls = uniqueAccountIds.map(
    (accountId) =>
      `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/${accountId}`
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
    const properties = cleanedData.flatMap((item) => item.properties || []); // Flatten to get all properties directly

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      properties.forEach((property: any) => {
        const fieldKey = property.name; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(property));
        } else {
          console.warn('Skipping property with undefined name:', property);
        }
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return properties; // Return only the properties array
  } catch (apiError) {
    console.error('Error fetching properties from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Function to get GA property
************************************************************************************/
export async function getGAProperty(propertyId: string, skipCache = false): Promise<any> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:properties:userId:${userId}`;

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }


  // Step 1: Check Redis cache for the specific propertyId
  if (!skipCache) {
    const cachedProperty = await redis.hget(cacheKey, propertyId);
    if (cachedProperty) {
      try {
        return JSON.parse(cachedProperty); // Return cached data if found
      } catch (error) {
        console.error('Failed to parse cached property:', error);
        await redis.hdel(cacheKey, propertyId); // Remove invalid cache
      }
    }
  }

  // Step 2: Fetch user data from the database
  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { ga: true },
  });

  if (!data) return null; // Return null if no user data found

  // Step 3: Fetch property data from the API
  const accountId = data.ga.find((item) => item.propertyId === propertyId)?.accountId;
  if (!accountId) return null; // Return null if no matching accountId is found

  const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    // Fetch the property from the API
    const property = await executeApiRequest(url, { headers });

    // Cache the property in Redis
    if (property && property.name) {
      await redis.hset(cacheKey, propertyId, JSON.stringify(property));
      await redis.expire(cacheKey, 2592000); // Set expiration for cache
    }

    return property; // Return the fetched property
  } catch (apiError) {
    console.error('Error fetching property from API:', apiError);
    return null; // Return null if API call fails
  }
}

/************************************************************************************
  Delete a single or multiple properties - Done
************************************************************************************/
export async function deleteProperties(
  selected: Set<z.infer<typeof PropertySchema>>,
  names: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }


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
        `Cannot delete more properties than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await Promise.all(
    Array.from(selected).map(async (data: any) => {
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${data.name}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'properties', names);
        successfulDeletions.push(data);

        await prisma.ga.deleteMany({
          where: {
            accountId: data.parent, // Extract account ID from property ID
            propertyId: data.name,
            userId, // Ensure this matches the user ID
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.name);
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
        data: { ...deletion },
      }));
      const cacheFields = successfulDeletions.map((del) => `properties/${del.name}`);

      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
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
      message: `Could not delete property. Please check your permissions. Property Name: ${names.find(
        (name) => name.includes(name)
      )}. All other properties were successfully deleted.`,
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
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length} property(ies)`,
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

/************************************************************************************
  Create a single property or multiple properties - DONE
************************************************************************************/
export async function createProperties(formData: {
  forms: FormSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }



  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    featureType,
    'create'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot create more properties than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      const url = `https://analyticsadmin.googleapis.com/v1beta/properties`;
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
            displayName: validatedData.forms[0].displayName,
            timeZone: validatedData.forms[0].timeZone,
            industryCategory: validatedData.forms[0].industryCategory,
            currencyCode: validatedData.forms[0].currencyCode,
            propertyType: validatedData.forms[0].propertyType,
            parent: validatedData.forms[0].parent,
          }),
        });

        // Add the created property to successful creations
        successfulCreations.push(res);

        const accountId = res.account.split('/')[1];
        const propertyId = res.name.split('/')[1];

        // Store the created property in the database
        await prisma.ga.create({
          data: {
            accountId: accountId,
            propertyId: propertyId,
            userId: userId,
          },
        });

        // Update the usage limit
        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.parent ?? 'Unknown', name: data.name ?? 'Unknown' });
        } else {
          errors.push(error.message);
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
        data: { ...creation },
      }));
      const cacheFields = successfulCreations.map((update) => `properties/${update.name}`);

      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
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
      message: `Some properties could not be found: ${notFoundLimit
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
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully created ${successfulCreations.length} property(ies)`,
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
  Create a single property or multiple properties - Done
************************************************************************************/
export async function updateProperties(formData: {
  forms: FormSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }



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
        `Cannot update more properties than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulUpdates: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const updateFields = ['displayName', 'timeZone', 'currencyCode', 'industryCategory'];
      const updateMask = updateFields.join(',');
      const propertyId = validatedData.forms[0].parent;
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}?updateMask=${updateMask}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const res = await executeApiRequest(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            displayName: validatedData.forms[0].displayName,
            timeZone: validatedData.forms[0].timeZone,
            industryCategory: validatedData.forms[0].industryCategory,
            currencyCode: validatedData.forms[0].currencyCode,
          }),
        });

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
        data: { ...update },
      }));

      const cacheFields = successfulUpdates.map((update) => `${update.name}`);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
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
      message: `Some properties could not be found: ${notFoundLimit
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
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} property(ies)`,
    features: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate this with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
  };
}

/************************************************************************************
  Update user data retention settings for a Google Analytics 4 property - Refactored Not Tested
************************************************************************************/
export async function updateDataRetentionSettings(formData: {
  forms: FormSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }


  let errors: string[] = [];
  let successfulUpdates: { name: string; parent: string; data?: any }[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  const toUpdateProperties = new Set(
    formData.forms.map((prop) => ({
      parent: prop.parent,
      displayName: prop.displayName,
      name: prop.name,
      timeZone: prop.timeZone,
      currencyCode: prop.currencyCode,
      industryCategory: prop.industryCategory,
      propertyType: prop.propertyType,
      retention: prop.retention,
      retentionReset: prop.resetOnNewActivity,
    }))
  );

  await Promise.all(
    Array.from(toUpdateProperties).map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const updateFields = ['eventDataRetention', 'resetUserDataOnNewActivity'];
      const updateMask = updateFields.join(',');
      // Ensure validatedData has the correct property ID format for URL
      const propertyId = validatedData.forms[0].name;
      const url = `https://analyticsadmin.googleapis.com/v1beta/${propertyId}/dataRetentionSettings?updateMask=${updateMask}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const res = await executeApiRequest(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: `accounts/${validatedData.forms[0].parent}`,
            eventDataRetention: validatedData.forms[0].retention,
            resetUserDataOnNewActivity: validatedData.forms[0].retentionReset,
          }),
        });

        successfulUpdates.push({
          name: res.name,
          parent: res.parent,
          data: validatedData.forms[0], // Add additional data as needed for Redis
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
        type: 'update' as const, // Explicitly set the type as "update"
        property: {
          name: update.name, // This is the Redis field (property name)
          parent: update.parent, // Parent should be included
          displayName: update.data.displayName, // Only update specific fields
          timeZone: update.data.timeZone, // Fields you're updating
          industryCategory: update.data.industryCategory, // Add fields as needed
          currencyCode: update.data.currencyCode, // Ensure this matches your Redis structure
          eventDataRetention: update.data.retention,
          resetUserDataOnNewActivity: update.data.retentionReset,
        },
      }));

      const cacheFields = successfulUpdates.map((update) => `properties/${update.name}`);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
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
      message: `Some properties could not be found: ${notFoundLimit
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
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} property(ies)`,
    features: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name], // Populate this with actual property IDs if available
      name: [property.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
  };
}

/************************************************************************************
  Get user data retention settings for a Google Analytics 4 property -  Tested
************************************************************************************/
export async function getDataRetentionSettings(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:dataRetentionSettings:userId:${userId}`;

  try {
    await ensureRateLimits(userId);
  } catch (error: any) {
    // Log the error and return an empty array or handle it gracefully
    console.error('Rate limit exceeded:', error.message);
    return []; // Return an empty array to match the expected type
  }


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


  const uniquePropertyIds = Array.from(new Set(data.ga.map((item) => item.propertyId)));
  const urls = uniquePropertyIds.map(
    (propertyId) =>
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataRetentionSettings`
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

    // Flatten properties from the structure
    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      cleanedData.forEach((property: any) => {
        const fieldKey = property.name.split('/').slice(0, 2).join('/'); // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(property));
        } else {
          console.warn('Skipping property with undefined name:', property);
        }
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }
    return cleanedData; // Return only the properties array
  } catch (apiError) {
    console.error('Error fetching properties from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
Acknowledge user data collection for a Google Analytics 4 property done
************************************************************************************/
export async function acknowledgeUserDataCollection(formData: {
  forms: FormSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }

  let errors: string[] = [];
  let successfulUpdates: { name: string; parent: string; data?: any }[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  // Process the form data and acknowledge user data collection for each property
  await Promise.all(
    formData.forms.map(async (data) => {
      try {
        // Validate the form data
        const validatedData = await validateFormData(FormSchema, { forms: [data] });

        const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${data.name}:acknowledgeUserDataCollection`;
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
        };

        const payload = JSON.stringify({
          acknowledgement:
            'I acknowledge that I have the necessary privacy disclosures and rights from my end users for the collection and processing of their data, including the association of such data with the visitation information Google Analytics collects from my site and/or app property.',
        });

        // Execute the API request
        await executeApiRequest(url, {
          method: 'POST',
          headers,
          body: payload,
        });

        // Push successful updates
        successfulUpdates.push({
          name: data.name as string,
          parent: data.parent,
          data: validatedData.forms[0],
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name as string);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.name, name: data.displayName });
        } else {
          errors.push(`Failed to update property ${data.name}: ${error.message}`);
        }
      }
    })
  );

  // Prepare and return the response based on the outcomes
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some properties could not be found: ${notFoundLimit
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

  if (featureLimitReached.length > 0) {
    return {
      success: false,
      limitReached: true,
      notFoundError: false,
      message: `Feature limit reached for properties: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((propertyName) => ({
        id: [],
        name: [propertyName],
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
    message: `Successfully acknowledged data collection for ${successfulUpdates.length} property(ies)`,
    features: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: false,
    results: successfulUpdates.map<FeatureResult>((property) => ({
      id: [property.name],
      name: [property.name],
      success: true,
    })),
  };
}

/************************************************************************************
Returns metadata for dimensions and metrics available in reporting methods. Used to explore the dimensions and metrics. In this method, a Google Analytics GA4 Property data is specified in the request, and the metadata response includes Custom dimensions and metrics as well as Universal metadata. - DONE I THINK
************************************************************************************/
export async function getMetadataProperties(skipCache = false): Promise<FeatureResponse> {
  const userId = await authenticateUser(); // Authenticate user and get userId
  const token = await getOauthToken(userId); // Get OAuth token for the user
  const cacheKey = `ga:metadataProperties:userId:${userId}`;

  // Centralized rate limit enforcement
  const rateLimitResult = await ensureRateLimits(userId);
  if (rateLimitResult) {
    // If rate limit exceeded, return the error response immediately
    return rateLimitResult;
  }

  let errors: string[] = [];
  let allData: any[] = []; // Initialize an array to store all metadata properties
  let notFoundLimit: string[] = [];

  // Fetch cached data if available
  if (!skipCache) {
    const cacheData = await redis.hgetall(cacheKey);
    if (Object.keys(cacheData).length > 0) {
      try {
        const parsedData = Object.values(cacheData).map((data) => JSON.parse(data));
        return {
          success: true,
          message: 'Successfully retrieved metadata properties from cache.',
          features: parsedData.map((property) => ({
            id: [property.name],
            name: [property.name],
            success: true,
          })),
          results: parsedData,
          errors: [],
          notFoundError: false,
        };
      } catch (error) {
        console.error('Failed to parse cache data:', error);
        await redis.del(cacheKey);
      }
    }
  }

  // Ensure Google Analytics settings are fetched
  await fetchGASettings(userId);

  // Fetch GA data from the database
  const gaData = await prisma.user.findFirst({
    where: { id: userId },
    include: { ga: true },
  });

  if (!gaData) {
    console.error('Google Analytics data not found for user:', userId);
    return {
      success: false,
      message: 'Google Analytics data not found.',
      features: [],
      results: [],
      errors: ['Google Analytics data not found for user.'],
      notFoundError: true,
    };
  }

  const uniqueAccountIds = Array.from(new Set(gaData.ga.map((item) => item.accountId)));

  // Process GA properties for each unique account
  await Promise.all(
    uniqueAccountIds.map(async (accountId) => {
      const propertiesUrl = `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/${accountId}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const propertiesResponse = await executeApiRequest(propertiesUrl, { headers });
        const properties = propertiesResponse.properties || [];

        // For each property, fetch its metadata and store results
        await Promise.all(
          properties.map(async (property) => {
            const metadataUrl = `https://analyticsdata.googleapis.com/v1beta/${property.name}/metadata`;

            try {
              const metadataResponse = await executeApiRequest(metadataUrl, { headers });
              allData.push({
                ...property,
                dataRetentionSettings: metadataResponse,
              });
            } catch (error: any) {
              allData.push(property); // Push property without data retention settings in case of error
              console.error(
                `Error fetching data retention settings for ${property.name}: ${error.message}`
              );
              errors.push(`Error fetching data retention settings for ${property.name}`);
            }
          })
        );
      } catch (error: any) {
        console.error(`Error fetching properties for account ${accountId}: ${error.message}`);
        errors.push(`Error fetching properties for account ${accountId}`);
      }
    })
  );

  // Cache the results before returning
  // Cache the results using hset instead of set
  try {
    const pipeline = redis.pipeline(); // Use Redis pipeline for multiple hset operations

    allData.forEach((property: any) => {
      pipeline.hset(cacheKey, property.name, JSON.stringify(property)); // Store each property under its name
    });

    pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash (1 day)
    await pipeline.exec(); // Execute the pipeline commands
  } catch (error) {
    console.error('Failed to cache metadata properties data:', error);
    errors.push('Failed to cache metadata properties data.');
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: 'Errors occurred while fetching metadata properties.',
      features: [],
      results: allData,
      errors,
      notFoundError: notFoundLimit.length > 0,
    };
  }

  return {
    success: true,
    message: 'Successfully retrieved metadata properties.',
    features: allData.map((property) => ({
      id: [property.name],
      name: [property.name],
      success: true,
    })),
    results: allData,
    errors: [],
    notFoundError: false,
  };
}

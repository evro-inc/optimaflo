'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { gaRateLimit } from '../../../../redis/rateLimits';
import { limiter } from '../../../../bottleneck';
import { redis } from '@/src/lib/redis/cache';
import { notFound } from 'next/navigation';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureRateLimits,
  executeApiRequest,
  getOauthToken,
  handleApiResponseError,
  softRevalidateFeatureCache,
  tierCreateLimit,
  tierUpdateLimit,
  validateFormData,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import {
  PropertyPermissionsSchema,
  FormsSchema,
  PropertyAccessSchema,
  FormSchema,
} from '@/src/lib/schemas/ga/propertyAccess';
import { z } from 'zod';

const featureType: string = 'GA4PropertyAccess';

/************************************************************************************
  Function to list GA accountAccess
************************************************************************************/
export async function listGAAccessBindings(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:propertyAccess:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.hgetall(cacheKey);
    if (Object.keys(cacheData).length > 0) {
      try {
        const parsedData = Object.values(cacheData).map((data) => JSON.parse(data));
        return parsedData;
      } catch (error) {
        console.error('Failed to parse cache data:', error);
        await redis.del(cacheKey); // Clear cache if parsing fails
      }
    }
  }

  // Fetch data from Prisma
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

  // Get unique propertyIds and form the API URLs
  const uniquePropertyIds = Array.from(new Set(data.ga.map((item) => item.propertyId)));
  const urls = uniquePropertyIds.map(
    (propertyId) =>
      `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    const flattenedAccessBindings = allData.flatMap((item) => item.accessBindings || []);

    // Filter out null/undefined/empty values
    const cleanedData = flattenedAccessBindings.filter(
      (item) => item && Object.keys(item).length > 0
    );

    // Group access bindings by propertyId and ensure uniqueness
    const groupedAccessBindings = cleanedData.reduce((acc, accessBinding) => {
      const propertyId = accessBinding.name.split('/')[1]; // Extract propertyId from name
      if (!acc[propertyId]) {
        acc[propertyId] = { accessBindings: new Set() }; // Using Set to ensure uniqueness
      }
      acc[propertyId].accessBindings.add(JSON.stringify(accessBinding)); // Add unique accessBinding
      return acc;
    }, {});

    // Convert sets back to arrays and prepare for Redis storage
    Object.keys(groupedAccessBindings).forEach((propertyId) => {
      groupedAccessBindings[propertyId].accessBindings = Array.from(
        groupedAccessBindings[propertyId].accessBindings,
        (item: string) => JSON.parse(item)
      );
    });

    try {
      // Use HMSET to store each property's access bindings under a single field
      const pipeline = redis.pipeline();
      Object.entries(groupedAccessBindings).forEach(([propertyId, propertyData]) => {
        const fieldKey = `properties/${propertyId}`;
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(propertyData));
      });

      pipeline.expire(cacheKey, 7776000); // Set expiration for 3 months since this data doesn't change too often
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return Object.values(groupedAccessBindings);
  } catch (apiError) {
    console.error('Error fetching properties from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Create a single property or multiple accountAccess
************************************************************************************/
export async function createGAAccessBindings(formData: {
  forms: PropertyPermissionsSchema['forms'];
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
        `Cannot create more permissions than available. You have ${availableUsage} creations left.`,
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
      const cleanedData = validatedData.forms[0];

      const url = `https://analyticsadmin.googleapis.com/v1alpha/${cleanedData.property}/accessBindings`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      // Accessing the validated property data
      let requestBody: any = {
        user: cleanedData.user,
        roles: cleanedData.roles,
      };


      try {
        const res = await executeApiRequest(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        successfulCreations.push(res);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.property ?? 'Unknown', name: data.name ?? 'Unknown' });
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
      const cacheFields = successfulCreations.map((update) => `${update.name}`);

      await softRevalidateFeatureCache(
        [`ga:propertyAccess:userId:${userId}`],
        `/dashboard/ga/access-permissions`,
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
      message: `Some permissions could not be found: ${notFoundLimit
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
      message: `Feature limit reached for permissions: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully created ${successfulCreations.length} permission(s)`,
    features: successfulCreations.map<FeatureResult>((cd) => ({
      id: [],
      name: [cd.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulCreations.map<FeatureResult>((cd) => ({
      id: [],
      name: [cd.name],
      success: true,
    })),
  };
}

/************************************************************************************
  Update a single property or multiple custom metrics
************************************************************************************/
export async function updateGAAccessBindings(formData: {
  forms: PropertyPermissionsSchema['forms'];
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
        `Cannot update more permissions than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];
  let successfulUpdates: any[] = [];

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      const cleanedData = validatedData.forms[0];
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      const url = `https://analyticsadmin.googleapis.com/v1alpha/${cleanedData.name}`;

      let requestBody: any = {
        user: cleanedData.user,
        roles: cleanedData.roles,
      };

      try {
        const res = await executeApiRequest(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(requestBody),
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
        [`ga:propertyAccess:userId:${userId}`],
        `/dashboard/ga/access-permissions`,
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
      message: `Some dimensions could not be found: ${notFoundLimit
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
      message: `Feature limit reached for permissions: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} permission(s)`,
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


/************************************************************************************
  Delete a single property or multiple custom metrics
************************************************************************************/
export async function deleteGAAccessBindings(
  selected: Set<z.infer<typeof PropertyAccessSchema>>,
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
        `Cannot delete more permissions than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: z.infer<typeof PropertyAccessSchema>[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureRateLimits(userId);

  await Promise.all(
    Array.from(selected).map(async (data) => {
      const propertyId = data?.name?.split('/')[1]; // Extract the property ID from 'name'

      const account = await prisma.ga.findFirst({
        where: { propertyId: propertyId, userId }, // Query the account info by propertyId
        select: { accountId: true }, // Only select the accountId
      });

      if (!account) {
        errors.push(`Account not found for property ID: ${propertyId}`);
        return;
      }

      const url = `https://analyticsadmin.googleapis.com/v1alpha/${data.name}`;

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
            accountId: account.accountId, // Extract account ID from property ID
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
          featureLimitReached.push(data.name as string);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.name as string);
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
        type: 'delete' as const, // Explicitly set the type as "delete"
        data: { ...deletion },
      }));

      const cacheFields = successfulDeletions.map((update) => `${update.name}`);

      // Call softRevalidateFeatureCache for deletions
      await softRevalidateFeatureCache(
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/access-permissions`,
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
      message: `Could not delete permission. Please check your permissions. Property Name: ${names.find(
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
      message: `Feature limit reached: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length}`,
    features: successfulDeletions.map<FeatureResult>((data: any) => ({
      id: [data.name], // Wrap propertyId in an array to match FeatureResult type
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'], // Wrap name in an array to match FeatureResult type
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data: any) => ({
      id: [data.name], // FeatureResult.id is an array
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'], // FeatureResult.name is an array
      success: true, // FeatureResult.success indicates if the operation was successful
    })),
  };
}
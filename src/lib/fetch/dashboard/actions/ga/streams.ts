'use server';

import { redis } from '@/src/lib/redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';
import { FormSchema, DataStreamType } from '@/src/lib/schemas/ga/streams';

const featureType: string = 'GA4Streams';

/************************************************************************************
  Function to list GA streams
************************************************************************************/
export async function listGAPropertyStreams(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:streams:userId:${userId}`;

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

  const uniquePropertyIds = Array.from(new Set(data.ga.map((item) => item.propertyId)));
  const urls = uniquePropertyIds.map(
    (propertyId) =>
      `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/dataStreams`
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
    const streams = cleanedData.flatMap((item) => item.dataStreams || []); // Flatten to get all properties directly

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      streams.forEach((data: any) => {
        const fieldKey = data.name; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(data));
        } else {
          console.warn('Skipping property with undefined name:', data);
        }
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return streams; // Return only the properties array
  } catch (apiError) {
    console.error('Error fetching properties from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}
/************************************************************************************
  Delete a single property or multiple streams
************************************************************************************/
export async function deleteGAPropertyStreams(
  selected: Set<DataStreamType>,
  names: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
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
        `Cannot delete more streams than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];
  let successfulDeletions: any[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data: DataStreamType) => {
      const url = `https://analyticsadmin.googleapis.com/v1beta/${data.name}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const res = await executeApiRequest(url, { method: 'DELETE', headers }, 'streams', names);
        successfulDeletions.push(data);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.displayName);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(data.displayName);
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
        ...deletion,
      }));
      const cacheFields = successfulDeletions.map((deletion) => `${deletion.name}`);

      await softRevalidateFeatureCache(
        [`ga:streams:userId:${userId}`],
        `/dashboard/ga/properties`,
        userId,
        operations, // Pass the operations array for deletions
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
      name: [names.find((name) => name.includes(data.displayName)) || 'Unknown'], // Wrap name in an array to match FeatureResult type
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name], // FeatureResult.id is an array
      name: [names.find((name) => name.includes(data.displayName)) || 'Unknown'], // FeatureResult.name is an array
      success: true, // FeatureResult.success indicates if the operation was successful
    })),
  };
}

/************************************************************************************
  Create a single property or multiple streams
************************************************************************************/
export async function createGAPropertyStreams(formData: {
  forms: DataStreamType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
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
        `Cannot create more streams than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const propertyId = validatedData.forms[0].property;

      const url = `https://analyticsadmin.googleapis.com/v1beta/${propertyId}/dataStreams`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      const validatedContainerData = validatedData.forms[0];

      let requestBody: any = {
        displayName: validatedContainerData.displayName,
        type: validatedContainerData.type,
      };

      // Dynamically add the specific stream data based on the type
      switch (validatedContainerData.type) {
        case 'WEB_DATA_STREAM':
          requestBody = {
            ...requestBody,
            webStreamData: {
              defaultUri: validatedContainerData?.webStreamData?.defaultUri,
            },
          };
          break;
        case 'ANDROID_APP_DATA_STREAM':
          requestBody = {
            ...requestBody,
            androidAppStreamData: {
              packageName: validatedContainerData?.androidAppStreamData?.packageName,
            },
          };
          break;
        case 'IOS_APP_DATA_STREAM':
          requestBody = {
            ...requestBody,
            iosAppStreamData: {
              bundleId: validatedContainerData?.iosAppStreamData?.bundleId,
            },
          };
          break;
        // You can add more cases here if there are other types
        default:
          // Handle unexpected type or throw an error
          throw new Error('Unsupported stream type');
      }

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
          featureLimitReached.push(data.displayName ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.name ?? 'Unknown', name: data.displayName ?? 'Unknown' });
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
        ...creation, // Include any additional data as needed
      }));
      const cacheFields = successfulCreations.map((creation) => `${creation.name}`);

      await softRevalidateFeatureCache(
        [`ga:streams:userId:${userId}`],
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
    message: `Successfully created ${successfulCreations.length} streams(s)`,
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
  Update a single property or multiple streams
************************************************************************************/
export async function updateGAPropertyStreams(formData: {
  forms: DataStreamType['forms'];
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
        `Cannot update more streams than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];
  let successfulUpdates: any[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });
      const cleanedData = validatedData.forms[0];
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };
      let updateFields: string[] = [];

      switch (cleanedData.type) {
        case 'WEB_DATA_STREAM':
          updateFields = ['displayName', 'webStreamData.defaultUri'];
          break;
        case 'ANDROID_APP_DATA_STREAM':
          updateFields = ['displayName', 'androidAppStreamData.packageName'];
          break;
        case 'IOS_APP_DATA_STREAM':
          updateFields = ['displayName', 'iosAppStreamData.bundleId'];
          break;
      }

      const updateMask = updateFields.join(',');
      const url = `https://analyticsadmin.googleapis.com/v1beta/${cleanedData.parentURL}?updateMask=${updateMask}`;

      let requestBody: any = {
        displayName: cleanedData.displayName,
        type: cleanedData.type,
      };

      // Dynamically add the specific stream data based on the type
      switch (cleanedData.type) {
        case 'WEB_DATA_STREAM':
          requestBody = {
            ...requestBody,
            webStreamData: {
              defaultUri: cleanedData?.webStreamData?.defaultUri,
            },
          };
          break;
        case 'ANDROID_APP_DATA_STREAM':
          requestBody = {
            ...requestBody,
            androidAppStreamData: {
              packageName: cleanedData?.androidAppStreamData?.packageName,
            },
          };
          break;
        case 'IOS_APP_DATA_STREAM':
          requestBody = {
            ...requestBody,
            iosAppStreamData: {
              bundleId: cleanedData?.iosAppStreamData?.bundleId,
            },
          };
          break;
        // You can add more cases here if there are other types
        default:
          // Handle unexpected type or throw an error
          throw new Error('Unsupported stream type');
      }

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
        ...update,
      }));

      const cacheFields = successfulUpdates.map((update) => `${update.name}`);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`ga:streams:userId:${userId}`],
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
    features: successfulUpdates.map<FeatureResult>((stream) => ({
      id: [stream.name], // Populate with actual property IDs if available
      name: [stream.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((stream) => ({
      id: [stream.name], // Populate this with actual property IDs if available
      name: [stream.name], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
  };
}

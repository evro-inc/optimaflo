'use server';

import { redis } from '@/src/lib/redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GA4PropertyType } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  revalidate,
  validateFormData,
} from '@/src/utils/server';
import { fetchGASettings } from '../..';
import { FormSchemaType, FormSchema } from '@/src/lib/schemas/ga/properties';

const featureType: string = 'GA4Properties';


/************************************************************************************
  Function to list GA properties
************************************************************************************/
export async function listGAProperties(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `ga:properties:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      try {
        const parsedData = JSON.parse(cacheData);
        return parsedData;
      } catch (error) {
        console.error("Failed to parse cache data:", error);
        // Clear corrupted cache data if necessary
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

    try {
      const jsonData = JSON.stringify(flattenedData);

      await redis.set(cacheKey, jsonData, 'EX', 86400); // Cache for 24 hours
    } catch (cacheError) {
      console.error("Failed to stringify or set cache data:", cacheError);
    }

    return flattenedData;
  } catch (apiError) {
    console.error("Error fetching properties from API:", apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}



/************************************************************************************
  Delete a single or multiple properties
************************************************************************************/
export async function deleteProperties(
  selectedProperties: Set<string>,
  propertyNames: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'delete');

  if (tierLimitResponse.limitReached || selectedProperties.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [`Cannot delete more properties than available. You have ${availableUsage} deletions left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selectedProperties).map(async (propertyId) => { // Note: Changed 'data' to 'propertyId'
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'properties', propertyNames);
        successfulDeletions.push(propertyId);

        await prisma.ga.deleteMany({
          where: {
            accountId: `accounts/${propertyId.split('/')[1]}`, // Extract account ID from property ID
            propertyId,
            userId, // Ensure this matches the user ID
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });

      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(propertyId);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(propertyId);
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Deletions**:
  if (successfulDeletions.length > 0) {
    try {
      // Only revalidate the affected properties
      await revalidate(
        successfulDeletions.map((id) => `ga:properties:userId:${userId}:${id}`),
        `/dashboard/ga/properties`,
        userId
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
      message: `Could not delete property. Please check your permissions. Property Name: ${propertyNames.find((name) =>
        name.includes(name)
      )}. All other properties were successfully deleted.`,
      results: notFoundLimit.map((propertyId) => ({
        id: [propertyId], // Ensure id is an array
        name: [propertyNames.find((name) => name.includes(propertyId)) || 'Unknown'], // Ensure name is an array
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
      results: featureLimitReached.map((propertyId) => ({
        id: [propertyId], // Ensure id is an array
        name: [propertyNames.find((name) => name.includes(propertyId)) || 'Unknown'], // Ensure name is an array
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
    features: successfulDeletions.map<FeatureResult>((propertyId) => ({
      id: [propertyId],  // Wrap propertyId in an array to match FeatureResult type
      name: [propertyNames.find((name) => name.includes(propertyId)) || 'Unknown'],  // Wrap name in an array to match FeatureResult type
      success: true,  // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((propertyId) => ({
      id: [propertyId],  // FeatureResult.id is an array
      name: [propertyNames.find((name) => name.includes(propertyId)) || 'Unknown'],  // FeatureResult.name is an array
      success: true,  // FeatureResult.success indicates if the operation was successful
    })),
  };
}


/************************************************************************************
  Create a single property or multiple properties
************************************************************************************/
export async function createProperties(
  formData: { forms: FormSchemaType['forms'] }
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'create');

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [`Cannot create more properties than available. You have ${availableUsage} creations left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  let createdData: any = []

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
        const createdProperty = await executeApiRequest(url, {
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

        successfulCreations.push(data.name);
        createdData.push(createdProperty);

        const accountId = createdProperty.account.split('/')[1];
        const propertyId = createdProperty.name.split('/')[1];

        await prisma.ga.create({
          data: {
            accountId: accountId,  // Use the extracted numeric ID
            propertyId: propertyId,  // Use the property name from createdProperty
            userId: userId,  // Ensure this matches the user ID
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.parent, name: data.name });
        } else {
          errors.push(error.message);
        }
      }
    })
  );


  // **Perform Selective Revalidation After All Creations**:
  if (successfulCreations.length > 0) {
    try {
      // Only revalidate the affected properties
      await revalidate(
        createdData,
        [`ga:properties:userId:${userId}`],
        `/dashboard/ga/properties`,
        userId
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
      message: `Some properties could not be found: ${notFoundLimit.map(item => item.name).join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [],  // Ensure id is an array and filter out undefined
        name: [item.name],  // Ensure name is an array to match FeatureResult type
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
        id: [],  // Populate with actual property IDs if available
        name: [propertyName],  // Wrap the string in an array
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
    features: successfulCreations.map<FeatureResult>((propertyName) => ({
      id: [], // Populate with actual property IDs if available
      name: [propertyName], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulCreations.map<FeatureResult>((propertyName) => ({
      id: [],  // Populate this with actual property IDs if available
      name: [propertyName],  // Wrap the string in an array
      success: true,  // Indicates success of the operation
    })),
  };
}

/************************************************************************************
  Create a single property or multiple properties
************************************************************************************/
export async function updateProperties(
  formData: { forms: FormSchemaType['forms'] }
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'update');

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available updates.',
      errors: [`Cannot update more properties than available. You have ${availableUsage} updates left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulUpdates: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];
  const accountIdsForCache = new Set<string>();

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      accountIdsForCache.add(data.parent);
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      const updateFields = ['displayName', 'timeZone', 'currencyCode', 'industryCategory'];
      const updateMask = updateFields.join(',');

      // Ensure validatedData has the correct property ID format for URL
      const propertyId = validatedData.forms[0].parent;
      const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}?updateMask=${updateMask}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            displayName: validatedData.forms[0].displayName,
            timeZone: validatedData.forms[0].timeZone,
            industryCategory: validatedData.forms[0].industryCategory,
            currencyCode: validatedData.forms[0].currencyCode,
          }),
        });

        // Assuming property name is unique and used for revalidation, extract it correctly
        const propertyName = validatedData.forms[0].name;
        successfulUpdates.push(propertyName);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { updateUsage: { increment: 1 } },
        });

        // Immediate revalidation per each update is not needed, aggregate revalidation is better
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(validatedData.forms[0].name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: validatedData.forms[0].parent, name: validatedData.forms[0].name });
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
      await revalidate(
        successfulUpdates.map((name) => `ga:properties:userId:${userId}`),
        `/dashboard/ga/properties`,
        userId
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
      message: `Some properties could not be found: ${notFoundLimit.map(item => item.name).join(', ')}`,
      results: notFoundLimit.map((item) => ({
        id: item.id ? [item.id] : [],  // Ensure id is an array and filter out undefined
        name: [item.name],  // Ensure name is an array to match FeatureResult type
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
        id: [],  // Populate with actual property IDs if available
        name: [propertyName],  // Wrap the string in an array
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
    features: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [propertyName], // Populate with actual property IDs if available
      name: [propertyName], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [propertyName],  // Populate this with actual property IDs if available
      name: [propertyName],  // Wrap the string in an array
      success: true,  // Indicates success of the operation
    })),
  };
}


/************************************************************************************
  Update user data retention settings for a Google Analytics 4 property
************************************************************************************/
export async function updateDataRetentionSettings(
  formData: { forms: FormSchemaType['forms'] }
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  let errors: string[] = [];
  let successfulUpdates: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  // Prepare properties to update
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

  // Ensure rate limit before processing updates
  await ensureGARateLimit(userId);

  // Process updates concurrently
  await Promise.all(
    Array.from(toUpdateProperties).map(async (data) => {
      try {
        // Validate form data for each property
        const validatedData = await validateFormData(FormSchema, {
          forms: [data],
        });

        const updateFields = ['eventDataRetention', 'resetUserDataOnNewActivity'];
        const updateMask = updateFields.join(',');

        const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${data.name}/dataRetentionSettings?updateMask=${updateMask}`;
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
        };

        // Execute the API request
        await executeApiRequest(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            name: `accounts/${validatedData.forms[0].parent}`,
            eventDataRetention: validatedData.forms[0].retention,
            resetUserDataOnNewActivity: validatedData.forms[0].retentionReset,
          }),
        });

        // If update was successful
        successfulUpdates.push(data.name);
        toUpdateProperties.delete(data);

        // **Update Cache Selectively**:
        try {
          const cacheKey = `ga:properties:userId:${userId}`;
          const cacheData = await redis.get(cacheKey);

          if (cacheData) {
            const parsedCacheData = JSON.parse(cacheData);
            const updatedCacheData = parsedCacheData.map((property: any) =>
              property.name === data.name
                ? { ...property, ...validatedData.forms[0] }
                : property
            );

            await redis.set(cacheKey, JSON.stringify(updatedCacheData), 'EX', 86400); // Cache for 24 hours
          }
        } catch (cacheError) {
          console.error('Failed to update cache:', cacheError);
        }

      } catch (error: any) {
        // Handle different error scenarios
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.parent, name: data.name });
        } else {
          errors.push(`Failed to update property ${data.name}: ${error.message}`);
        }
        toUpdateProperties.delete(data);
      }
    })
  );

  // **Perform Selective Revalidation After All Updates**:
  if (successfulUpdates.length > 0) {
    try {
      await revalidate(
        successfulUpdates.map((name) => `ga:properties:userId:${userId}`),
        `/dashboard/ga/properties`,
        userId
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Prepare response based on outcomes
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some properties could not be found: ${notFoundLimit.map(item => item.name).join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} property(ies)`,
    features: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [],
      name: [propertyName],
      success: true,
    })),
    errors: [],
    notFoundError: false,
    results: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [],
      name: [propertyName],
      success: true,
    })),
  };
}


/************************************************************************************
Acknowledge user data collection for a Google Analytics 4 property
************************************************************************************/
export async function acknowledgeUserDataCollection(
  selectedRows: GA4PropertyType[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  let errors: string[] = [];
  let successfulUpdates: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  // Prepare properties to update
  const toUpdateProperties = new Set(
    selectedRows.map((prop) => ({
      name: prop.name,
    }))
  );

  await ensureGARateLimit(userId);

  // Process updates concurrently
  await Promise.all(
    Array.from(toUpdateProperties).map(async (data) => {
      const propertyData = selectedRows.find((prop) => prop.name === data.name);

      if (!propertyData) {
        errors.push(`Property data not found for ${data.name}`);
        toUpdateProperties.delete(data);
        return;
      }

      try {
        // Validate form data for each property
        const rowDataToValidate = { forms: [propertyData] };
        await validateFormData(FormSchema, rowDataToValidate);

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

        // Execute the API request with retry logic
        const response = await executeApiRequest(url, {
          method: 'POST',
          headers,
          body: payload,
        });

        // Handle successful update
        successfulUpdates.push(propertyData.name);
        toUpdateProperties.delete(data);

        // **Update Cache Selectively**:
        try {
          const cacheKey = `ga:properties:userId:${userId}`;
          const cacheData = await redis.get(cacheKey);

          if (cacheData) {
            const parsedCacheData = JSON.parse(cacheData);
            const updatedCacheData = parsedCacheData.map((property: any) =>
              property.name === data.name
                ? { ...property, acknowledged: true } // Assuming you want to add an acknowledged flag or similar update
                : property
            );

            await redis.set(cacheKey, JSON.stringify(updatedCacheData), 'EX', 86400); // Cache for 24 hours
          }
        } catch (cacheError) {
          console.error('Failed to update cache:', cacheError);
        }

      } catch (error: any) {
        // Handle different error scenarios
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(propertyData.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.name, name: propertyData.displayName });
        } else {
          errors.push(`Failed to update property ${propertyData.name}: ${error.message}`);
        }
        toUpdateProperties.delete(data);
      }
    })
  );

  // **Perform Selective Revalidation After All Updates**:
  if (successfulUpdates.length > 0) {
    try {
      await revalidate(
        successfulUpdates.map((name) => `ga:properties:userId:${userId}`),
        `/dashboard/ga/properties`,
        userId
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Prepare response based on outcomes
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some properties could not be found: ${notFoundLimit.map((item) => item.name).join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} property(ies)`,
    features: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [],
      name: [propertyName],
      success: true,
    })),
    errors: [],
    notFoundError: false,
    results: successfulUpdates.map<FeatureResult>((propertyName) => ({
      id: [],
      name: [propertyName],
      success: true,
    })),
  };
}



/************************************************************************************
Returns metadata for dimensions and metrics available in reporting methods. Used to explore the dimensions and metrics. In this method, a Google Analytics GA4 Property data is specified in the request, and the metadata response includes Custom dimensions and metrics as well as Universal metadata.
************************************************************************************/
export async function getMetadataProperties(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser(); // Authenticate user and get userId
  const token = await getOauthToken(userId); // Get OAuth token for the user
  const cacheKey = `ga:metadataProperties:userId:${userId}`;

  if (!skipCache) {
    const cachedData = await redis.get(cacheKey); // Attempt to retrieve cached data
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        return parsedData; // Return cached data if available
      } catch (error) {
        console.error("Failed to parse cached data:", error);
        // Optionally handle or clear corrupted cache
        await redis.del(cacheKey);
      }
    }
  }

  await fetchGASettings(userId); // Fetch Google Analytics settings

  const gaData = await prisma.user.findFirst({
    where: { id: userId },
    include: { ga: true },
  });

  if (!gaData) {
    console.error("Google Analytics data not found for user:", userId);
    return [];
  }

  const uniqueAccountIds = Array.from(new Set(gaData.ga.map((item) => item.accountId)));

  await ensureGARateLimit(userId); // Ensure rate limit before processing

  const allData: any[] = []; // Initialize an array to store all metadata properties

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
              console.error(`Error fetching data retention settings for ${property.name}: ${error.message}`);
            }
          })
        );
      } catch (error: any) {
        console.error(`Error fetching properties for account ${accountId}: ${error.message}`);
      }
    })
  );

  // Cache the results before returning
  try {
    await redis.set(cacheKey, JSON.stringify(allData), 'EX', 86400); // Cache for 24 hours
  } catch (error) {
    console.error("Failed to cache metadata properties data:", error);
  }

  return allData; // Return all the fetched metadata properties
}


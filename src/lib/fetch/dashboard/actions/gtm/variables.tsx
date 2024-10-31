'use server';

import {
  FormSchema,
  revertVariableSchema,
  VariableSchema,
  VariableSchemaType,
} from '@/src/lib/schemas/gtm/variables';
import { redis } from '../../../../redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureRateLimits,
  executeApiRequest,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';
import { z } from 'zod';

const featureType: string = 'GTMVariables';

/************************************************************************************
  Function to list or get one GTM variables
************************************************************************************/
export async function listVariables(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:variables:userId:${userId}`;

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
    include: { gtm: true },
  });

  if (!data) return [];

  try {
    await ensureRateLimits(userId);
  } catch (error: any) {
    // Log the error and return an empty array or handle it gracefully
    console.error('Rate limit exceeded:', error.message);
    return []; // Return an empty array to match the expected type
  }

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
          containerId: item.containerId,
          workspaceId: item.workspaceId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  const urls = uniqueItems.map(
    ({ accountId, containerId, workspaceId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`
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
    const ws = cleanedData.flatMap((item) => item.variable || []); // Flatten to get all workspaces directly

    try {
      const pipeline = redis.pipeline();
      const workspaceVariablesMap = new Map();
      ws.forEach((w) => {
        const fieldKey = `${w.accountId}/${w.containerId}/${w.workspaceId}/${w.variableId}`;

        if (!workspaceVariablesMap.has(fieldKey)) {
          workspaceVariablesMap.set(fieldKey, []);
        }

        // Add the current variable to the corresponding workspace's list
        workspaceVariablesMap.get(fieldKey).push(w);
      });

      workspaceVariablesMap.forEach((variables, fieldKey) => {
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(variables));
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return ws; // Return only the ws array
  } catch (apiError) {
    console.error('Error fetching ws from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Delete a single or multiple variables
************************************************************************************/
export async function deleteVariables(
  selected: Set<z.infer<typeof VariableSchema>>,
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
        `Cannot delete more built-in variables than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: z.infer<typeof VariableSchema>[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];


  await Promise.all(
    Array.from(selected).map(async (data) => {
      const url = `https://www.googleapis.com/tagmanager/v2/${data.path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'variables', names);
        successfulDeletions.push(data);

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
      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}/${del.variableId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:variables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Handling responses for various scenarios like feature limit reached or not found errors
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not delete variable. Please check your permissions. Variable : ${names.find(
        (name) => name.includes(name)
      )}. All other variables were successfully deleted.`,
      results: notFoundLimit.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
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
      message: `Feature limit reached for variable: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
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
    message: `Successfully deleted ${successfulDeletions.length} variable(s)`,
    features: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [names.find((name) => name.includes(data.name)) || 'Unknown'],
      success: true,
    })),
  };
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function createVariables(formData: {
  forms: VariableSchemaType['forms'];
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
        `Cannot create more variables than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successful: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];


  // Loop over each form and each accountContainerWorkspace combination
  await Promise.all(
    formData.forms.map(async (form) => {
      for (const workspaceData of form.accountContainerWorkspace) {
        try {
          const validatedData = await validateFormData(FormSchema, { forms: [form] });

          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}/variables`;

          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Prepare body to match the required structure
          const requestBody = {
            ...validatedData.forms[0],
            accountId: workspaceData.accountId,
            containerId: workspaceData.containerId,
            workspaceId: workspaceData.workspaceId,
          };

          // Execute API request
          const res = await executeApiRequest(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          // Add the created property to successful creations
          successful.push(res);

          // Update the usage limit
          await prisma.tierLimit.update({
            where: { id: tierLimitResponse.id },
            data: { createUsage: { increment: 1 } },
          });
        } catch (error: any) {
          if (error.message === 'Feature limit reached') {
            featureLimitReached.push(form.name ?? 'Unknown');
          } else if (error.message.includes('404')) {
            notFoundLimit.push({
              id: workspaceData.containerId ?? 'Unknown',
              name: form.name ?? 'Unknown',
            });
          } else {
            errors.push(error.message);
          }
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successful.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successful.map((creation) => ({
        crudType: 'create' as const, // Explicitly set the type as "create"
        data: { ...creation }, // Put all remaining fields into data
      }));

      const cacheFields = successful.map(
        ({ accountId, containerId, workspaceId, variableId }) =>
          `${accountId}/${containerId}/${workspaceId}/${variableId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:variables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
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
      message: `Some variables could not be found: ${notFoundLimit
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
      message: `Feature limit reached for variables: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully created ${successful.length} variable(s)`,
    features: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

/************************************************************************************
  Revert a single or multiple variables - Remove limits from revert. Users shouldn't be limited when reverting changes.
************************************************************************************/
export async function revertVariables(
  selected: Set<z.infer<typeof revertVariableSchema>>,
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
      errors: [`Cannot revert more triggers than available. You have ${availableUsage} left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: z.infer<typeof revertVariableSchema>[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  // **Filter Selected Items to Only Include Valid Tags**:
  const filteredSelected = Array.from(selected).filter(
    (data) => data.variable && data.variable.path
  );

  await Promise.all(
    filteredSelected.map(async (data) => {
      // Now `data.tag` and `data.tag.path` are guaranteed to exist
      const url = `https://www.googleapis.com/tagmanager/v2/${data.variable.path}:revert`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'POST', headers }, 'tags', names);
        successfulDeletions.push(data);

        // Update Tier Limit Usage
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
      const operations = successfulDeletions.map((deletion) => ({
        crudType: 'delete' as const,
        data: { ...deletion },
      }));
      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}/${del.variableId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:variables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  // Handling responses for various scenarios like feature limit reached or not found errors
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not revert the tag. Please check your permissions. Tag: ${names.find((name) =>
        name.includes(name)
      )}. All other tags were successfully deleted.`,
      results: notFoundLimit.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
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
      message: `Feature limit reached for tag: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((data) => ({
        id: [data],
        name: [names.find((name) => name.includes(data)) || 'Unknown'],
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
    message: `Successfully reverted ${successfulDeletions.length} tag(s)`,
    features: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [data.name || 'Unknown'],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((data) => ({
      id: [data.name],
      name: [data.name || 'Unknown'],
      success: true,
    })),
  };
}

/************************************************************************************
  Update a single container or multiple variables
************************************************************************************/
export async function updateVariables(formData: {
  forms: VariableSchemaType['forms'];
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
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot update more variables than available. You have ${availableUsage} creations left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successful: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  // Loop over each form and each accountContainerWorkspace combination
  await Promise.all(
    formData.forms.map(async (form) => {
      for (const workspaceData of form.accountContainerWorkspace) {
        try {
          const validatedData = await validateFormData(FormSchema, { forms: [form] });

          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${workspaceData.accountId}/containers/${workspaceData.containerId}/workspaces/${workspaceData.workspaceId}/variables/${workspaceData.variableId}`;

          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
          };

          // Prepare body to match the required structure
          const requestBody = {
            ...validatedData.forms[0],
            accountId: workspaceData.accountId,
            containerId: workspaceData.containerId,
            workspaceId: workspaceData.workspaceId,
          };

          // Execute API request
          const res = await executeApiRequest(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody),
          });

          // Add the created property to successful creations
          successful.push(res);

          // Update the usage limit
          await prisma.tierLimit.update({
            where: { id: tierLimitResponse.id },
            data: { updateUsage: { increment: 1 } },
          });
        } catch (error: any) {
          if (error.message === 'Feature limit reached') {
            featureLimitReached.push(form.name ?? 'Unknown');
          } else if (error.message.includes('404')) {
            notFoundLimit.push({
              id: workspaceData.containerId ?? 'Unknown',
              name: form.name ?? 'Unknown',
            });
          } else {
            errors.push(error.message);
          }
        }
      }
    })
  );

  // **Perform Selective Revalidation After All Creations**:
  if (successful.length > 0) {
    try {
      // Map successful creations to the appropriate structure for Redis
      const operations = successful.map((update) => ({
        crudType: 'update' as const, // Explicitly set the type as "create"
        data: { ...update },
      }));

      const cacheFields = successful.map(
        (c) => `${c.accountId}/${c.containerId}/${c.workspaceId}/${c.variableId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:variables:userId:${userId}`],
        `/dashboard/gtm/configurations`,
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
      message: `Some variables could not be found: ${notFoundLimit
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
      message: `Feature limit reached for variables: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successful.length} variable(s)`,
    features: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successful.map<FeatureResult>((property) => ({
      id: [],
      name: [property.name],
      success: true,
    })),
  };
}

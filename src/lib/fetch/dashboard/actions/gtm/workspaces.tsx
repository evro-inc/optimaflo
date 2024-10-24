'use server';

import { FormSchema, WorkspaceSchemaType } from '@/src/lib/schemas/gtm/workspaces';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { redis } from '../../../../redis/cache';
import { currentUserOauthAccessToken } from '../../../../clerk';
import prisma from '@/src/lib/prisma';
import { FeatureResponse, FeatureResult, Workspace } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  fetchWithRetry,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';
// Define the types for the form data

const featureType: string = 'GTMWorkspaces';

/************************************************************************************
  Function to list or get one GTM workspaces
************************************************************************************/
export async function listGtmWorkspaces(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:workspaces:userId:${userId}`;

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

  await ensureGARateLimit(userId);

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
    ({ accountId, containerId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces?fields=workspace(accountId,containerId,name,workspaceId)`
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

    const ws = cleanedData.flatMap((item) => item.workspace || []); // Flatten to get all workspaces directly

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      ws.forEach((ws: any) => {
        const fieldKey = ws.accountId + '/' + ws.containerId + '/' + ws.workspaceId; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(ws));
        } else {
          console.warn('Skipping workspace with undefined name:', ws);
        }
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
  Delete a single or multiple workspaces
************************************************************************************/
export async function deleteWorkspaces(
  selected: Set<Workspace>,
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
        `Cannot delete more workspaces than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selected).map(async (data: Workspace) => {
      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/workspaces/${data.workspaceId}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'containers', names);
        successfulDeletions.push(data);

        await prisma.gtm.deleteMany({
          where: {
            accountId: data.accountId, // Extract account ID from property ID
            containerId: data.containerId,
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
        ...deletion,
      }));
      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:workspaces:userId:${userId}`],
        `/dashboard/gtm/entities`,
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
      message: `Could not delete workspace. Please check your permissions. Workspace Name: ${names.find(
        (name) => name.includes(name)
      )}. All other workspaces were successfully deleted.`,
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
      message: `Feature limit reached for workspaces: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length} workspace(s)`,
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
  Create a single container or multiple containers
************************************************************************************/
export async function createWorkspaces(formData: {
  forms: WorkspaceSchemaType['forms'];
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
        `Cannot create more workspaces than available. You have ${availableUsage} creations left.`,
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
      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/workspaces`;

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
            accountId: validatedData.forms[0].accountId,
            name: validatedData.forms[0].name,
            description: validatedData.forms[0].description,
            containerId: validatedData.forms[0].containerId,
          }),
        });

        // Add the created property to successful creations
        successfulCreations.push(res);

        const listWS = await executeApiRequest(url, { headers });
        // Check if workspaceId is present
        if (!listWS.workspace || listWS.workspace.length === 0) {
          throw new Error('No workspace found for the created container.');
        }

        // Get the workspaceId from the fetched container details
        const matchedWorkspace = listWS.workspace.find(
          (workspace: any) => workspace.containerId === res.containerId
        );

        const workspaceId = matchedWorkspace.workspaceId;

        await prisma.gtm.create({
          data: {
            userId,
            accountId: res.accountId,
            containerId: res.containerId,
            workspaceId,
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
          notFoundLimit.push({ id: data.containerId ?? 'Unknown', name: data.name ?? 'Unknown' });
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

      const cacheFields = successfulCreations.map(
        (del) => `${del.accountId}/${del.containerId}/${del.workspaceId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:workspaces:userId:${userId}`],
        `/dashboard/gtm/entities`,
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
      message: `Some workspaces could not be found: ${notFoundLimit
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
      message: `Feature limit reached for workspaces: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully created ${successfulCreations.length} workspace(s)`,
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
  Udpate a single container or multiple containers
************************************************************************************/
export async function updateWorkspaces(formData: {
  forms: WorkspaceSchemaType['forms'];
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
        `Cannot update more workspaces than available. You have ${availableUsage} updates left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulUpdates: any[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (data) => {
      const validatedData = await validateFormData(FormSchema, { forms: [data] });

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/workspaces/${data.workspaceId}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const res = await executeApiRequest(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            accountId: validatedData.forms[0].accountId,
            name: validatedData.forms[0].name,
            description: validatedData.forms[0].description,
            containerId: validatedData.forms[0].containerId,
            workspaceId: validatedData.forms[0].workspaceId,
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
        ...update,
      }));

      const cacheFields = successfulUpdates.map((update) => `${update.name}`);

      // Call softRevalidateFeatureCache for updates
      await softRevalidateFeatureCache(
        [`gtm:workspaces:userId:${userId}`],
        `/dashboard/gtm/entities`,
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
      message: `Some workspaces could not be found: ${notFoundLimit
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
      message: `Feature limit reached for workspaces: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully updated ${successfulUpdates.length} workspace(s)`,
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
  Create a single GTM version or multiple GTM versions
************************************************************************************/
export async function createGTMVersion(formData: {
  forms: WorkspaceSchemaType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  // Create uniqueForms to remove duplicates
  const uniqueForms = formData.forms.filter(
    (value, index, self) =>
      index ===
      self.findIndex(
        (t) =>
          t.workspaceId === value.workspaceId &&
          t.accountId === value.accountId &&
          t.containerId === value.containerId
      )
  );

  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    'GTMWorkspaces',
    'create'
  );

  if (tierLimitResponse.limitReached || uniqueForms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot create more versions than available. You have ${availableUsage} creations left.`,
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
    uniqueForms.map(async (data) => {
      try {
        const validatedData = await validateFormData(FormSchema, { forms: [data] });

        const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/workspaces/${data.workspaceId}:create_version`;

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
        };

        const payload = JSON.stringify({
          name: validatedData.forms[0].name,
          notes: validatedData.forms[0].description,
        });

        const response = await executeApiRequest(
          url,
          {
            method: 'POST',
            headers,
            body: payload,
          },
          'workspace',
          [data.name ?? 'Unknown']
        );

        successfulCreations.push(response);

        // Update usage counters in database
        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });

        // Delete the workspace from the database as a new version has been created
        await prisma.gtm.deleteMany({
          where: {
            accountId: data.accountId,
            containerId: data.containerId,
            workspaceId: data.workspaceId,
            userId: userId,
          },
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: data.workspaceId ?? 'Unknown', name: data.name ?? 'Unknown' });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  if (successfulCreations.length > 0) {
    try {
      const operations = successfulCreations.map((creation) => ({
        crudType: 'delete' as const,
        data: creation,
      }));
      const cacheFields = successfulCreations.map((del) => {
        const accountId = del.containerVersion.accountId;
        const containerId = del.containerVersion.containerId;
        const workspaceId = del.containerVersion.containerVersionId;

        return `${accountId}/${containerId}/${workspaceId}`;
      });

      await softRevalidateFeatureCache(
        [`gtm:workspaces:userId:${userId}`],
        `/dashboard/gtm/entities`,
        userId,
        operations,
        cacheFields
      );
    } catch (err) {
      console.error('Error during revalidation:', err);
    }
  }

  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some workspaces could not be found: ${notFoundLimit
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
      message: `Feature limit reached for workspaces: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((workspaceName) => ({
        id: [],
        name: [workspaceName],
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
    message: `Successfully created versions for ${successfulCreations.length} workspace(s)`,
    features: successfulCreations.map<FeatureResult>((workspace) => ({
      id: [],
      name: [workspace.name],
      success: true,
    })),
    errors: [],
    notFoundError: false,
    results: successfulCreations.map<FeatureResult>((workspace) => ({
      id: [],
      name: [workspace.name],
      success: true,
    })),
  };
}

/************************************************************************************
  Function to list or get one GTM workspaces - Error: Error fetching data: HTTP error! status: 429. Too Many Requests
************************************************************************************/
export async function getStatusGtmWorkspaces() {
  // Authenticating the user and getting the user ID
  const { userId } = await auth();
  if (!userId) return notFound();

  const token = await currentUserOauthAccessToken(userId);

  const gtmData = await prisma.user.findFirst({
    where: { id: userId },
    include: { gtm: true },
  });

  if (!gtmData || !gtmData.gtm) {
    throw new Error('No GTM data found for the user.');
  }

  const uniquePairs = new Set(
    gtmData.gtm.map((data) => `${data.accountId}-${data.containerId}-${data.workspaceId}`)
  );

  const urls = Array.from(uniquePairs).map((pair: any) => {
    const [accountId, containerId, workspaceId] = pair.split('-');
    return `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/status`;
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  let allData: any[] = [];
  for (const url of urls) {
    try {
      const data = await fetchWithRetry(url, headers);
      allData.push(data);
    } catch (error: any) {
      console.error(`Failed to fetch URL: ${url}, error: ${error.message}`);
      // Here, we decide whether to continue or break out. For this example, let's continue.
      // To break out and stop further requests, use: throw new Error(error.message);
    }
  }

  return allData.flat();
}

'use server';

import { ContainerSchemaType, FormSchema } from '@/src/lib/schemas/gtm/containers';
import { redis } from '@/src/lib/redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse } from '@/src/types/types';
import { authenticateUser, checkFeatureLimit, ensureGARateLimit, executeApiRequest, getOauthToken, revalidate, validateFormData } from '@/src/utils/server';


const featureType: string = 'GTMContainer';

/************************************************************************************
 Lists GTM containers for the authenticated user
************************************************************************************/
export async function listGtmContainers(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:containers:userId:${userId}`;

  if (!skipCache) {
    const cacheData = await redis.get(cacheKey);
    if (cacheData) {
      try {
        const parsedData = JSON.parse(cacheData);
        return parsedData;
      } catch (error) {
        console.error("Failed to parse cache data:", error);
        console.log("Cached data:", cacheData); // Log the cached data for inspection
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

  const uniqueAccountIds = Array.from(new Set(data.gtm.map((item) => item.accountId)));
  const urls = uniqueAccountIds.map(
    (accountId) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers?fields=container(accountId,containerId,name,publicId,usageContext)`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));

  await redis.set(cacheKey, JSON.stringify(allData.flat()), 'EX', 86400);

  return allData.flat();
}

/************************************************************************************
  Deletes GTM containers for the authenticated user 
************************************************************************************/
export async function deleteContainers(
  selectedContainers: Set<string>,
  containerNames: string[]
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'delete');

  if (tierLimitResponse.limitReached || selectedContainers.size > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available deletions.',
      errors: [`Cannot delete more containers than available. You have ${availableUsage} deletions left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    Array.from(selectedContainers).map(async (containerData: any) => {

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${containerData.accountId}/containers/${containerData.containerId}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip'
      };
      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'containers', containerNames);
        successfulDeletions.push(containerData.containerId);

        await prisma.gtm.deleteMany({
          where: {
            accountId: containerData.accountId,
            containerId: containerData.containerId,
            workspaceId: containerData.workspaceId,
            userId
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { deleteUsage: { increment: 1 } },
        });
        await revalidate([`gtm:containers:userId:${userId}`, `gtm:workspaces:userId:${userId}`, `gtm:versions:userId:${userId}`, `gtm:permissions:userId:${userId}`], `/dashboard/gtm/entities`, userId).catch((err) => {
          console.error('Error during revalidation:', err);
        });
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(containerData.containerId);
        } else if (error.message.includes('404')) {
          notFoundLimit.push(containerData.containerId);
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // Check for not found containers and return response if applicable
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      message: `Could not delete container. Please check your permissions. Container Name: ${containerNames.find((name) =>
        name.includes(name)
      )}. All other containers were successfully deleted.`,
      results: notFoundLimit.map((containerId) => ({
        id: [containerId], // Ensure id is an array
        name: [containerNames.find((name) => name.includes(containerId)) || 'Unknown'], // Ensure name is an array
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
      message: `Feature limit reached for containers: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((containerId) => ({
        id: [containerId], // Ensure id is an array
        name: [containerNames.find((name) => name.includes(containerId)) || 'Unknown'], // Ensure name is an array
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
    message: `Successfully deleted ${successfulDeletions.length} container(s)`,
    features: successfulDeletions.map<FeatureResult>((containerId) => ({
      id: [containerId],  // Wrap containerId in an array to match FeatureResult type
      name: [containerNames.find((name) => name.includes(containerId)) || 'Unknown'],  // Wrap name in an array to match FeatureResult type
      success: true,  // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulDeletions.map<FeatureResult>((containerId) => ({
      id: [containerId],  // FeatureResult.id is an array
      name: [containerNames.find((name) => name.includes(containerId)) || 'Unknown'],  // FeatureResult.name is an array
      success: true,  // FeatureResult.success indicates if the operation was successful
    })),
  };

}

/************************************************************************************
  Creates GTM containers for the authenticated user 
************************************************************************************/
export async function createContainers(
  formData: { forms: ContainerSchemaType['forms'] }
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'create');

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [`Cannot create more containers than available. You have ${availableUsage} creations left.`],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulCreations: string[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: { id: string | undefined; name: string }[] = [];

  await ensureGARateLimit(userId);

  await Promise.all(
    formData.forms.map(async (containerData) => {
      const validatedData = await validateFormData(FormSchema, { forms: [containerData] });

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${containerData.accountId}/containers/`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        const createdContainer = await executeApiRequest(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            accountId: containerData.accountId,
            name: containerData.name,
            usageContext: validatedData.forms[0].usageContext,
            domainName: validatedData.forms[0].domainName,
            notes: validatedData.forms[0].notes,
          }),
        });

        const getContainerUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${createdContainer.accountId}/containers/${createdContainer.containerId}/workspaces`;
        const listWS = await executeApiRequest(getContainerUrl, { headers });
        // Check if workspaceId is present
        if (!listWS.workspace || listWS.workspace.length === 0) {
          throw new Error('No workspace found for the created container.');
        }

        // Get the workspaceId from the fetched container details
        const matchedWorkspace = listWS.workspace.find((workspace: any) => workspace.containerId === createdContainer.containerId);

        const workspaceId = matchedWorkspace.workspaceId;

        successfulCreations.push(containerData.name);

        await prisma.gtm.create({
          data: {
            userId,
            accountId: containerData.accountId,
            containerId: createdContainer.containerId,
            workspaceId,
          },
        });

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { createUsage: { increment: 1 } },
        });

        await revalidate([`gtm:containers:userId:${userId}`, `gtm:workspaces:userId:${userId}`, `gtm:versions:userId:${userId}`, `gtm:permissions:userId:${userId}`], `/dashboard/gtm/entities`, userId).catch((err) => {
          console.error('Error during revalidation:', err);
        });

      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(containerData.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: containerData.containerId, name: containerData.name });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // Check for not found errors and return if any
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some containers could not be found: ${notFoundLimit.map(item => item.name).join(', ')}`,
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
      message: `Feature limit reached for containers: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((containerName) => ({
        id: [],  // Populate with actual container IDs if available
        name: [containerName],  // Wrap the string in an array
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
    message: `Successfully created ${successfulCreations.length} container(s)`,
    features: successfulCreations.map<FeatureResult>((containerName) => ({
      id: [], // Populate with actual container IDs if available
      name: [containerName], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulCreations.map<FeatureResult>((containerName) => ({
      id: [],  // Populate this with actual container IDs if available
      name: [containerName],  // Wrap the string in an array
      success: true,  // Indicates success of the operation
    })),
  };
}


/************************************************************************************
  Updates GTM containers for the authenticated user
************************************************************************************/
export async function updateContainers(
  formData: { forms: ContainerSchemaType['forms'] }
): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(userId, featureType, 'update');

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available updates.',
      errors: [`Cannot update more containers than available. You have ${availableUsage} updates left.`],
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
    formData.forms.map(async (containerData) => {
      accountIdsForCache.add(containerData.accountId);
      const validatedData = await validateFormData(FormSchema, { forms: [containerData] });

      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${containerData.accountId}/containers/${containerData.containerId}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            accountId: containerData.accountId,
            name: containerData.name,
            usageContext: validatedData.forms[0].usageContext,
            domainName: validatedData.forms[0].domainName,
            notes: validatedData.forms[0].notes,
          }),
        });

        successfulUpdates.push(containerData.name);

        await prisma.tierLimit.update({
          where: { id: tierLimitResponse.id },
          data: { updateUsage: { increment: 1 } },
        });

        await revalidate([`gtm:containers:userId:${userId}`], `/dashboard/gtm/entities`, userId).catch((err) => {
          console.error('Error during revalidation:', err);
        });

      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(containerData.name);
        } else if (error.message.includes('404')) {
          notFoundLimit.push({ id: containerData.containerId, name: containerData.name });
        } else {
          errors.push(error.message);
        }
      }
    })
  );

  // Check for not found errors and return if any
  if (notFoundLimit.length > 0) {
    return {
      success: false,
      limitReached: false,
      notFoundError: true,
      features: [],
      message: `Some containers could not be found: ${notFoundLimit.map(item => item.name).join(', ')}`,
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
      message: `Feature limit reached for containers: ${featureLimitReached.join(', ')}`,
      results: featureLimitReached.map((containerName) => ({
        id: [],  // Populate with actual container IDs if available
        name: [containerName],  // Wrap the string in an array
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
    message: `Successfully created ${successfulUpdates.length} container(s)`,
    features: successfulUpdates.map<FeatureResult>((containerName) => ({
      id: [], // Populate with actual container IDs if available
      name: [containerName], // Wrap the string in an array
      success: true, // Indicates success of the operation
    })),
    errors: [],
    notFoundError: notFoundLimit.length > 0,
    results: successfulUpdates.map<FeatureResult>((containerName) => ({
      id: [],  // Populate this with actual container IDs if available
      name: [containerName],  // Wrap the string in an array
      success: true,  // Indicates success of the operation
    })),
  };


}

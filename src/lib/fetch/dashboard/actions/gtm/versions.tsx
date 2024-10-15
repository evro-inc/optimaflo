'use server';

import { redis } from '@/src/lib/redis/cache';
import prisma from '@/src/lib/prisma';
import { FeatureResult, FeatureResponse, GTMContainerVersion } from '@/src/types/types';
import {
  authenticateUser,
  checkFeatureLimit,
  ensureGARateLimit,
  executeApiRequest,
  getOauthToken,
  softRevalidateFeatureCache,
  validateFormData,
} from '@/src/utils/server';
import { ContainerVersionType } from '@/src/lib/schemas/gtm/versions';

const featureType: string = 'GTMVersions';

/************************************************************************************
  Function to list GTM Versions
************************************************************************************/
export async function listGTMVersionHeaders(skipCache = false): Promise<any[]> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:versions:userId:${userId}`;

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
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  const urls = uniqueItems.map(
    ({ accountId, containerId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/version_headers`
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
    const data = cleanedData.flatMap((item) => item.containerVersionHeader || []); // Flatten to get all workspaces directly

    try {
      // Use HSET to store each property under a unique field
      const pipeline = redis.pipeline();

      data.forEach((data: any) => {
        const fieldKey = data.accountId + '/' + data.containerId + '/' + data.containerVersionId; // Access 'name' directly from the property object

        if (fieldKey) {
          // Ensure fieldKey is defined
          pipeline.hset(cacheKey, fieldKey, JSON.stringify(data));
        } else {
          console.warn('Skipping workspace with undefined name:', data);
        }
      });

      pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
      await pipeline.exec(); // Execute the pipeline commands
    } catch (cacheError) {
      console.error('Failed to set cache data with HSET:', cacheError);
    }

    return data; // Return only the data array
  } catch (apiError) {
    console.error('Error fetching data from API:', apiError);
    return []; // Return empty array or handle this more gracefully depending on your needs
  }
}

/************************************************************************************
  Function to get GTM lastest versions
************************************************************************************/
export async function getGTMLatestVersion(skipCache = false): Promise<any> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:latestVersions:userId:${userId}`;
  const pipeline = redis.pipeline();

  // Step 1: Check Redis cache for the specific propertyId
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

  // Step 2: Fetch user data from the database
  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { gtm: true },
  });

  if (!data) return null; // Return null if no user data found

  await ensureGARateLimit(userId);

  // Step 3: Fetch property data from the API

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
          containerId: item.containerId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  if (!uniqueItems) return null; // Return null if no matching accountId is found

  const urls = uniqueItems.map(
    ({ accountId, containerId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/version_headers:latest`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    // Fetch the property from the API
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    const flattenedData = allData.flat();
    const cleanedData = flattenedData.filter((item) => Object.keys(item).length > 0);
    const data = cleanedData.flatMap((item) => item || []); // Flatten to get all workspaces directly

    data.forEach((data: any) => {
      const fieldKey = data.accountId + '/' + data.containerId + '/' + data.containerVersionId; // Access 'name' directly from the property object

      if (fieldKey) {
        // Ensure fieldKey is defined
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(data));
      } else {
        console.warn('Skipping workspace with undefined name:', data);
      }
    });
    pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
    await pipeline.exec(); // Execute the pipeline commands

    return data; // Return the fetched property
  } catch (apiError) {
    console.error('Error fetching property from API:', apiError);
    return null; // Return null if API call fails
  }
}

/************************************************************************************
  Function to get GTM live versions
************************************************************************************/
export async function getGTMLiveVersion(skipCache = false): Promise<any> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);
  const cacheKey = `gtm:liveVersions:userId:${userId}`;
  const pipeline = redis.pipeline();

  // Step 1: Check Redis cache for the specific propertyId
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

  // Step 2: Fetch user data from the database
  const data = await prisma.user.findFirst({
    where: { id: userId },
    include: { gtm: true },
  });

  if (!data) return null; // Return null if no user data found

  await ensureGARateLimit(userId);

  // Step 3: Fetch property data from the API

  const uniqueItems = Array.from(
    new Set(
      data.gtm.map((item) =>
        JSON.stringify({
          accountId: item.accountId,
          containerId: item.containerId,
        })
      )
    )
  ).map((str: any) => JSON.parse(str));

  if (!uniqueItems) return null; // Return null if no matching accountId is found

  const urls = uniqueItems.map(
    ({ accountId, containerId }) =>
      `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/versions:live`
  );

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  try {
    // Fetch the property from the API
    const allData = await Promise.all(urls.map((url) => executeApiRequest(url, { headers })));
    const flattenedData = allData.flat();
    const cleanedData = flattenedData.filter((item) => Object.keys(item).length > 0);
    const data = cleanedData.flatMap((item) => item || []); // Flatten to get all workspaces directly

    data.forEach((data: any) => {
      const fieldKey = data.accountId + '/' + data.containerId + '/' + data.containerVersionId; // Access 'name' directly from the property object

      if (fieldKey) {
        // Ensure fieldKey is defined
        pipeline.hset(cacheKey, fieldKey, JSON.stringify(data));
      } else {
        console.warn('Skipping workspace with undefined name:', data);
      }
    });
    pipeline.expire(cacheKey, 2592000); // Set expiration for the entire hash
    await pipeline.exec(); // Execute the pipeline commands

    return data; // Return the fetched property
  } catch (apiError) {
    console.error('Error fetching property from API:', apiError);
    return null; // Return null if API call fails
  }
}

/************************************************************************************
  Delete a single or multiple versions
************************************************************************************/
export async function deleteVersions(
  selected: Set<GTMContainerVersion>,
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
        `Cannot delete more versions than available. You have ${availableUsage} deletions left.`,
      ],
      results: [],
    };
  }

  let errors: string[] = [];
  let successfulDeletions: GTMContainerVersion[] = [];
  let featureLimitReached: string[] = [];
  let notFoundLimit: string[] = [];

  // Step 1: Fetch live and latest versions for each GTM container in the selected set
  const liveVersions = new Set<string>(); // To store live version IDs
  const latestVersions = new Set<string>(); // To store latest version IDs

  await Promise.all(
    Array.from(selected).map(async (version) => {
      const { accountId, containerId } = version;

      // Fetch live version
      const liveUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/versions:live`;
      const latestUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/version_headers:latest`;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        // Fetch live and latest versions concurrently
        const [liveVersionResponse, latestVersionResponse] = await Promise.all([
          executeApiRequest(liveUrl, { headers }),
          executeApiRequest(latestUrl, { headers }),
        ]);

        // Add live and latest version IDs to the sets
        liveVersions.add(liveVersionResponse.containerVersionId);
        latestVersions.add(latestVersionResponse.containerVersionId);
      } catch (error) {
        console.error('Error fetching live/latest versions:', error);
      }
    })
  );

  // Step 2: Filter the selected versions to exclude live and latest ones
  const nonLiveAndNonLatest = Array.from(selected).filter(
    (version) =>
      !liveVersions.has(version.containerVersionId) &&
      !latestVersions.has(version.containerVersionId)
  );

  if (nonLiveAndNonLatest.length === 0) {
    return {
      success: false,
      message: 'No non-live or non-latest versions to delete.',
      errors: [],
      results: [],
    };
  }

  // Step 3: Proceed with deleting the filtered non-live, non-latest versions
  await ensureGARateLimit(userId);

  await Promise.all(
    nonLiveAndNonLatest.map(async (data: GTMContainerVersion) => {
      const url = `https://www.googleapis.com/tagmanager/v2/${data.path}`;
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      };

      try {
        await executeApiRequest(url, { method: 'DELETE', headers }, 'versions', names);
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

  if (successfulDeletions.length > 0) {
    // **Perform Selective Revalidation After All Deletions**:
    try {
      // Explicitly type the operations array
      const operations = successfulDeletions.map((deletion) => ({
        crudType: 'delete' as const, // Explicitly set the type as "delete"
        data: deletion, // Include the full version data as `data`
      }));

      const cacheFields = successfulDeletions.map(
        (del) => `${del.accountId}/${del.containerId}/${del.containerVersionId}`
      );

      await softRevalidateFeatureCache(
        [`gtm:versions:userId:${userId}`],
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
      message: `Could not delete version. Please check your permissions. Version Name: ${names.find(
        (name) => name.includes(name)
      )}. All other versions were successfully deleted.`,
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
      message: `Feature limit reached for versions: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully deleted ${successfulDeletions.length} version(s)`,
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
  Create a single GTM version or multiple GTM versions ---- NEEDS TO BE TESTED
************************************************************************************/
export async function publishGTM(formData: {
  forms: ContainerVersionType['forms'];
}): Promise<FeatureResponse> {
  const userId = await authenticateUser();
  const token = await getOauthToken(userId);

  const { tierLimitResponse, availableUsage } = await checkFeatureLimit(
    userId,
    'GTMVersions',
    'publish'
  );

  if (tierLimitResponse.limitReached || formData.forms.length > availableUsage) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached or request exceeds available creations.',
      errors: [
        `Cannot publish more versions than available. You have ${availableUsage} creations left.`,
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
      try {
        const url = `https://www.googleapis.com/tagmanager/v2/accounts/${data.accountId}/containers/${data.containerId}/versions/${data.containerVersionId}:publish`;

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
        };

        const response = await executeApiRequest(
          url,
          {
            method: 'POST',
            headers,
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
      } catch (error: any) {
        if (error.message === 'Feature limit reached') {
          featureLimitReached.push(data.name ?? 'Unknown');
        } else if (error.message.includes('404')) {
          notFoundLimit.push({
            id: data.containerVersionId ?? 'Unknown',
            name: data.name ?? 'Unknown',
          });
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
        [`gtm:workspaces:userId:${userId}`, `gtm:versions:userId:${userId}`],
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
      message: `Feature limit reached for publishing: ${featureLimitReached.join(', ')}`,
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
    message: `Successfully published`,
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
  Udpate a single multiple versions
************************************************************************************/
/* export async function UpdateVersions(formData: UpdateVersionSchemaType) {
  const { userId } = await auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);

  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;
  const errors: string[] = [];
  const successfulUpdates: string[] = [];
  const featureLimitReached: string[] = [];
  const notFoundLimit: { id: string; name: string }[] = [];

  let accountIdForCache: string | undefined;
  let containerIdForCache: string | undefined;

  // Refactor: Use string identifiers in the set
  const toUpdateVersions = new Set(
    formData.updateVersion.map((prop) => ({
      accountId: prop.accountId,
      containerId: prop.containerId,
      containerVersionId: prop.containerVersionId,
      name: prop.name,
      description: prop.description,
    }))
  );

  const tierLimitResponse: any = await tierUpdateLimit(userId, 'GTMVersions');
  const limit = Number(tierLimitResponse.updateLimit);
  const updateUsage = Number(tierLimitResponse.updateUsage);
  const availableUpdateUsage = limit - updateUsage;

  const UpdateResults: {
    versionName: string;
    success: boolean;
    message?: string;
  }[] = [];

  // Handling feature limit
  if (tierLimitResponse && tierLimitResponse.limitReached) {
    return {
      success: false,
      limitReached: true,
      message: 'Feature limit reached for updating versions',
      results: [],
    };
  }

  if (toUpdateVersions.size > availableUpdateUsage) {
    const attemptedUpdates = Array.from(toUpdateVersions).map((identifier) => {
      const { name: versionName } = identifier;
      return {
        id: [], // No version ID since update did not happen
        name: versionName, // Include the version name from the identifier
        success: false,
        message: `Update limit reached. Cannot update version "${versionName}".`,
        // remaining update limit
        remaining: availableUpdateUsage,
        limitReached: true,
      };
    });
    return {
      success: false,
      features: [],
      message: `Cannot update ${toUpdateVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      errors: [
        `Cannot update ${toUpdateVersions.size} versions as it exceeds the available limit. You have ${availableUpdateUsage} more update(s) available.`,
      ],
      results: attemptedUpdates,
      limitReached: true,
    };
  }

  let permissionDenied = false;
  const versionNames = formData.updateVersion.map((cd) => cd.name);

  if (toUpdateVersions.size <= availableUpdateUsage) {
    while (retries < MAX_RETRIES && toUpdateVersions.size > 0 && !permissionDenied) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
        if (remaining > 0) {
          await limiter.schedule(async () => {
            const updatePromises = Array.from(toUpdateVersions).map(async (identifier) => {
              accountIdForCache = identifier.accountId;
              containerIdForCache = identifier.containerId;
              const versionData = formData.updateVersion.find(
                (prop) =>
                  prop.accountId === identifier.accountId &&
                  prop.containerId === identifier.containerId &&
                  prop.containerVersionId === identifier.containerVersionId &&
                  prop.name === identifier.name &&
                  prop.description === identifier.description
              );

              if (!versionData) {
                errors.push(`Container data not found for ${identifier}`);
                toUpdateVersions.delete(identifier);
                return;
              }

              const url = `https://www.googleapis.com/tagmanager/v2/accounts/${versionData.accountId}/containers/${versionData.containerId}/versions/${versionData.containerVersionId}`;
              const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip',
              };

              try {
                const formDataToValidate = { updateVersion: [versionData] };

                const validationResult = UpdateVersionFormSchema.safeParse(formDataToValidate);

                if (!validationResult.success) {
                  let errorMessage = validationResult.error.issues
                    .map((issue) => `${issue.path[0]}: ${issue.message}`)
                    .join('. ');
                  errors.push(errorMessage);
                  toUpdateVersions.delete(identifier);
                  return {
                    versionData,
                    success: false,
                    error: errorMessage,
                  };
                }

                // Accessing the validated version data
                const validatedversionData = validationResult.data.updateVersion[0];
                const payload = JSON.stringify({
                  accountId: validatedversionData.accountId,
                  name: validatedversionData.name,
                  description: validatedversionData.description,
                  containerId: validatedversionData.containerId,
                  containerVersionId: validatedversionData.containerVersionId,
                });

                const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: payload,
                });

                const parsedResponse = await response.json();

                const versionName = versionData.name;

                if (response.ok) {
                  if (response.ok) {
                    // Push a string into the array, for example, a concatenation of versionId and containerId
                    successfulUpdates.push(
                      `${validatedversionData.containerVersionId}-${validatedversionData.containerId}`
                    );
                    // ... rest of your code
                  }
                  toUpdateVersions.delete(identifier);

                  await prisma.tierLimit.update({
                    where: { id: tierLimitResponse.id },
                    data: { updateUsage: { increment: 1 } },
                  });

                  UpdateResults.push({
                    versionName: versionName,
                    success: true,
                    message: `Successfully updated version ${versionName}`,
                  });
                } else {
                  const errorResult = await handleApiResponseError(
                    response,
                    parsedResponse,
                    'version',
                    [versionName]
                  );

                  if (errorResult) {
                    errors.push(`${errorResult.message}`);
                    if (
                      errorResult.errorCode === 403 &&
                      parsedResponse.message === 'Feature limit reached'
                    ) {
                      featureLimitReached.push(versionName);
                    } else if (errorResult.errorCode === 404) {
                      const versionName =
                        versionNames.find((name) => name.includes(identifier.name)) || 'Unknown';
                      notFoundLimit.push({
                        id: identifier.containerId,
                        name: versionName,
                      });
                    }
                  } else {
                    errors.push(`An unknown error occurred for version ${versionName}.`);
                  }

                  toUpdateVersions.delete(identifier);
                  permissionDenied = errorResult ? true : permissionDenied;
                  UpdateResults.push({
                    versionName: versionName,
                    success: false,
                    message: errorResult?.message,
                  });
                }
              } catch (error: any) {
                errors.push(
                  `Exception updating version ${versionData.containerVersionId}: ${error.message}`
                );
                toUpdateVersions.delete(identifier);
                UpdateResults.push({
                  versionName: versionData.name,
                  success: false,
                  message: error.message,
                });
              }
            });

            await Promise.all(updatePromises);
          });

          if (notFoundLimit.length > 0) {
            return {
              success: false,
              limitReached: false,
              notFoundError: true, // Set the notFoundError flag
              features: [],

              results: notFoundLimit.map((item) => ({
                id: item.id,
                name: item.name,
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
              message: `Feature limit reached for versions: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((versionId) => {
                // Find the name associated with the versionId
                const versionName =
                  versionNames.find((name) => name.includes(versionId)) || 'Unknown';
                return {
                  id: [versionId], // Ensure id is an array
                  name: [versionName], // Ensure name is an array, match by versionId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (featureLimitReached.length > 0) {
            return {
              success: false,
              limitReached: true,
              notFoundError: false,
              message: `Feature limit reached for versions: ${featureLimitReached.join(', ')}`,
              results: featureLimitReached.map((versionId) => {
                // Find the name associated with the versionId
                const versionName =
                  versionNames.find((name) => name.includes(versionId)) || 'Unknown';
                return {
                  id: [versionId], // Ensure id is an array
                  name: [versionName], // Ensure name is an array, match by versionId or default to 'Unknown'
                  success: false,
                  featureLimitReached: true,
                };
              }),
            };
          }

          if (successfulUpdates.length === formData.updateVersion.length) {
            break;
          }

          if (toUpdateVersions.size === 0) {
            break;
          }
        } else {
          throw new Error('Rate limit exceeded');
        }
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, delay + Math.random() * 200));
          delay *= 2;
          retries++;
        } else {
          break;
        }
      } finally {
        // This block will run regardless of the outcome of the try...catch
        if (accountIdForCache && containerIdForCache && userId) {
          const cacheKey = `gtm:versions:userId:${userId}`;
          await redis.del(cacheKey);
          await revalidatePath(`/dashboard/gtm/entities`);
        }
      }
    }
  }

  if (permissionDenied) {
    return {
      success: false,
      errors: errors,
      results: [],
      message: errors.join(', '),
    };
  }

  if (errors.length > 0) {
    return {
      success: false,
      features: successfulUpdates,
      errors: errors,
      results: successfulUpdates.map((versionName) => ({
        versionName,
        success: true,
      })),
      message: errors.join(', '),
    };
  }

  if (successfulUpdates.length > 0 && accountIdForCache && containerIdForCache) {
    const cacheKey = `gtm:versions:userId:${userId}`;
    await redis.del(cacheKey);
    revalidatePath(`/dashboard/gtm/entities`);
  }

  // Map over formData.forms to update the results array
  const results: FeatureResult[] = formData.updateVersion.map((form) => {
    // Ensure that form.versionId is defined before adding it to the array
    const versionId = form.containerVersionId ? [form.containerVersionId] : []; // Provide an empty array as a fallback
    return {
      id: versionId, // Ensure id is an array of strings
      name: [form.name], // Wrap the string in an array
      success: true, // or false, depending on the actual result
      // Include `notFound` if applicable
      notFound: false, // Set this to the appropriate value based on your logic
    };
  });

  // Return the response with the correctly typed results
  return {
    success: true, // or false, depending on the actual results
    features: [], // Populate with actual version IDs if applicable
    errors: [], // Populate with actual error messages if applicable
    limitReached: false, // Set based on actual limit status
    message: 'Containers updated successfully', // Customize the message as needed
    results: results, // Use the correctly typed results
    notFoundError: false, // Set based on actual not found status
  };
}
 */

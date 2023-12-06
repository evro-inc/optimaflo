'use server';
import { revalidatePath } from 'next/cache';
import { CreateContainerSchema } from '@/src/lib/schemas/containers';
import logger from '../logger';
import { getURL } from '@/src/lib/helpers';
import z from 'zod';
import { getAccessToken } from '../fetch/apiUtils';
import { currentUser, useSession } from '@clerk/nextjs';
import { gtmRateLimit } from '../redis/rateLimits';
import { limiter } from '../bottleneck';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateContainerSchema>;

/************************************************************************************
  List containers
************************************************************************************/
/************************************************************************************
  Function to list GTM containers
************************************************************************************/
export async function listGtmContainers(
  accessToken: string,
  accountId: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const user = await currentUser();
  const userId = user?.id as string;

  while (retries < MAX_RETRIES) {
    try {
      await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      let data;
      await limiter.schedule(async () => {
        const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status}. ${response.statusText}`
          );
        }

        const responseBody = await response.json();

        data = responseBody.container || [];
      });

      return data;
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get accounts...');
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        retries++;
      } else {
        throw error;
      }
    }
  }

  /*   while (retries < MAX_RETRIES) {
    try {
      await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
      
      // URL for the Google Tag Manager API
      const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}. ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.container || []; 
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get containers...');
        await new Promise((resolve) =>
          setTimeout(resolve, delay + Math.random() * 200)
        );
        delay *= 2;
        retries++;
      } else {
        throw error;
      }
    }
  } */

  throw new Error('Maximum retries reached without a successful response.');
}

/************************************************************************************
  Delete a single or multiple containers
************************************************************************************/
export async function DeleteContainers(
  accountId: string,
  selectedContainers: Set<string>
) {
  const { session } = useSession();

  const userId = session?.user?.id;

  const accessToken = await getAccessToken(userId);
  const baseUrl = getURL();
  const errors: string[] = [];

  const requestHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const featureLimitReachedContainers: string[] = [];

  const deletePromises = Array.from(selectedContainers).map(
    async (containerId) => {
      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}`,
        {
          method: 'DELETE',
          headers: requestHeaders,
        }
      );

      if (response.status === 403) {
        const parsedResponse = await response.json();
        if (parsedResponse.message === 'Feature limit reached') {
          featureLimitReachedContainers.push(containerId);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to delete container with ID ${containerId}: ${response.status}`
        );
        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to delete',
        };
      }

      return { success: true, containerId };
    }
  );

  const results = await Promise.all(deletePromises);

  if (featureLimitReachedContainers.length > 0) {
    throw new Error(
      `Feature limit reached for containers: ${featureLimitReachedContainers.join(
        ', '
      )}`
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  } else {
    revalidatePath(
      `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`
    );
    return {
      success: true,
      deletedContainers: results
        .filter((r) => r.success)
        .map((r) => r.containerId),
    };
  }
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function CreateContainers(formData: FormCreateSchema) {
  const { session } = useSession();

  try {
    const userId = session?.user?.id;

    const accessToken = await getAccessToken(userId);

    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Set<string>();
    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    // Now pass plainDataArray to CreateContainerSchema.safeParse within an object under the key 'forms'
    const validationResult = CreateContainerSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';

      validationResult.error.format();

      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();

      return {
        error: formattedErrorMessage,
      };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        containerName: formData.containerName,
        usageContext: formData.usageContext,
        accountId: formData.accountId,
        domainName: formData.domainName ? formData.domainName.split(',') : [''],
        notes: formData.notes,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const featureLimitReachedContainers: string[] = [];

    const createPromises = forms.map(async (containerData) => {
      const { containerName, usageContext, accountId, domainName, notes } =
        containerData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        name: containerName,
        usageContext: usageContext,
        accountId: accountId,
        notes: notes,
      };

      // Conditionally add domainName if it exists and is not empty
      if (domainName && domainName.length > 0 && domainName[0] !== '') {
        payload['domainName'] = domainName;
      }

      accountIdsToRevalidate.add(accountId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`,
        {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const createdContainer = await response.json();

      if (response.status === 403) {
        if (createdContainer.message === 'Feature limit reached') {
          featureLimitReachedContainers.push(containerData.containerName);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to create container with name ${containerData.containerName} in account ${containerData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to create',
        };
      }

      return { success: true, createdContainer };
    });

    const results = await Promise.all(createPromises);

    if (featureLimitReachedContainers.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      accountIdsToRevalidate.forEach((accountId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`
        );
      });
      return {
        success: true,
        limitReached: false,
        createdContainers: results
          .filter((r) => r.success)
          .map((r) => r.createdContainer),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return {
      success: false,
      limitReached: false,
      message: error.message,
    };
  }
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
/* export async function updateContainers(
  formData: FormUpdateSchema // Replace 'any' with the actual type if known
) {
  try {
    const { session } = useSession();

    const userId = session?.user?.id;

    const accessToken = await getAccessToken(userId);

    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Set<string>();
    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    const validationResult = UpdateContainerSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';

      validationResult.error.format();

      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();

      return {
        error: formattedErrorMessage,
      };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        containerName: formData.containerName,
        usageContext: formData.usageContext,
        accountId: formData.accountId,
        domainName: formData.domainName ? formData.domainName.split(',') : [''],
        notes: formData.notes,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    const featureLimitReachedContainers: string[] = [];

    const updatePromises = forms.map(async (containerData) => {
      const {
        containerName,
        usageContext,
        accountId,
        domainName,
        notes,
        containerId,
      } = containerData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        containerName: containerName,
        usageContext: usageContext,
        accountId: accountId,
        notes: notes,
        containerId: containerId,
      };

      // Conditionally add domainName if it exists and is not empty
      if (domainName && domainName.length > 0 && domainName[0] !== '') {
        payload['domainName'] = domainName;
      }

      accountIdsToRevalidate.add(accountId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}`,
        {
          method: 'PUT',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const updateContainer = await response.json();

      if (response.status === 403) {
        if (updateContainer.message === 'Feature limit reached') {
          featureLimitReachedContainers.push(containerData.containerName);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to update container with name ${containerData.containerName} in account ${containerData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to update',
        };
      }

      return { success: true, updateContainer };
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReachedContainers.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      accountIdsToRevalidate.forEach((accountId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`
        );
      });
      return {
        success: true,
        limitReached: false,
        udpateContainers: results
          .filter((r) => r.success)
          .map((r) => r.updateContainer),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return {
      success: false,
      limitReached: false,
      message: error.message,
    };
  }
} */

/************************************************************************************
  Combine containers
************************************************************************************/
/* export async function combineContainers(
  formData: FormUpdateSchema // Replace 'any' with the actual type if known
) {
  try {
    const { session } = useSession();

    const userId = session?.user?.id;

    const accessToken = await getAccessToken(userId);

    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Set<string>();
    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    const validationResult = UpdateContainerSchema.safeParse({
      forms: plainDataArray,
    });

    if (!validationResult.success) {
      let errorMessage = '';

      validationResult.error.format();

      validationResult.error.issues.forEach((issue) => {
        errorMessage =
          errorMessage + issue.path[0] + ': ' + issue.message + '. ';
      });
      const formattedErrorMessage = errorMessage
        .split(':')
        .slice(1)
        .join(':')
        .trim();

      return {
        error: formattedErrorMessage,
      };
    }

    validationResult.data.forms.forEach((formData: any) => {
      forms.push({
        containerName: formData.containerName,
        usageContext: formData.usageContext,
        accountId: formData.accountId,
        domainName: formData.domainName ? formData.domainName.split(',') : [''],
        notes: formData.notes,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const featureLimitReachedContainers: string[] = [];

    const updatePromises = forms.map(async (containerData) => {
      const {
        containerName,
        usageContext,
        accountId,
        domainName,
        notes,
        containerId,
      } = containerData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        containerName: containerName,
        usageContext: usageContext,
        accountId: accountId,
        notes: notes,
        containerId: containerId,
      };

      // Conditionally add domainName if it exists and is not empty
      if (domainName && domainName.length > 0 && domainName[0] !== '') {
        payload['domainName'] = domainName;
      }

      accountIdsToRevalidate.add(accountId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}`,
        {
          method: 'PUT',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const updateContainer = await response.json();

      if (response.status === 403) {
        if (updateContainer.message === 'Feature limit reached') {
          featureLimitReachedContainers.push(containerData.containerName);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to update container with name ${containerData.containerName} in account ${containerData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to update',
        };
      }

      return { success: true, updateContainer };
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReachedContainers.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for containers: ${featureLimitReachedContainers.join(
          ', '
        )}`,
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        limitReached: false,
        message: errors.join(', '),
      };
    } else {
      accountIdsToRevalidate.forEach((accountId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`
        );
      });
      return {
        success: true,
        limitReached: false,
        udpateContainers: results
          .filter((r) => r.success)
          .map((r) => r.updateContainer),
      };
    }
  } catch (error: any) {
    logger.error(error);
    return {
      success: false,
      limitReached: false,
      message: error.message,
    };
  }
} */

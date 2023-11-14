'use server';
import { revalidatePath } from 'next/cache';
import {
  CreateContainerSchema,
  UpdateContainerSchema,
} from '@/src/lib/schemas/containers';
import logger from '../logger';
import { getURL } from '@/src/lib/helpers';
import z from 'zod';
import { getAccessToken } from '../fetch/apiUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateContainerSchema>;
type FormUpdateSchema = z.infer<typeof UpdateContainerSchema>;

/************************************************************************************
  List containers
************************************************************************************/
export async function gtmListContainers() {
  try {
    const baseUrl = getURL();

    const url = `${baseUrl}/api/dashboard/gtm/accounts`;

    console.log('URL:', url);
    

    const resp = await fetch(url, { next: { revalidate: 10 } });

    const test = await fetch(url, { next: { revalidate: 10 } });

    console.log('Test:', await test.text());
    

    if (!resp.ok) {
      const responseText = await resp.text();
      console.log('Response Text:', responseText);

      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Response: ${responseText}`
      );
    }

    const gtmData = await resp.json();

    const accountIds = gtmData.data.map((container) => container.accountId);

    const containersPromises = accountIds.map(async (accountId) => {
      const containersUrl = `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`;

      const containersResp = await fetch(containersUrl, { next: { revalidate: 10 } });

      if (!containersResp.ok) {
        const responseText = await containersResp.text();
        console.error(
          `Error fetching containers for account ${accountId}: ${responseText}`
        );
        return []; // return an empty array on error
      }

      const containersData = await containersResp.json();
      return containersData[0]?.data || []; // ensure an array is returned
    });

    const containersArrays = await Promise.all(containersPromises);
    const containers = containersArrays.flat();

    return containers;
  } catch (error) {
    console.error('Error fetching GTM containers:', error);
    throw error;
  }
}

/************************************************************************************
  Delete a single or multiple containers
************************************************************************************/
export async function deleteContainers(
  accountId: string,
  selectedContainers: Set<string>
) {
  const session = await getServerSession(authOptions);

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
export async function createContainers(formData: FormCreateSchema) {
  try {
    const session = await getServerSession(authOptions);

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
export async function updateContainers(
  formData: FormUpdateSchema // Replace 'any' with the actual type if known
) {
  try {
    const session = await getServerSession(authOptions);

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
}

/************************************************************************************
  Combine containers
************************************************************************************/
export async function combineContainers(
  formData: FormUpdateSchema // Replace 'any' with the actual type if known
) {
  try {
    const session = await getServerSession(authOptions);

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
}

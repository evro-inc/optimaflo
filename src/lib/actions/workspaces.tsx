'use server';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
} from '@/src/lib/schemas/workspaces';
import logger from '../logger';
import z from 'zod';
import { getURL } from '@/src/lib/helpers';
import { gtmListContainers } from './containers';

// Define the types for the form data
type FormCreateSchema = z.infer<typeof CreateWorkspaceSchema>;
type FormUpdateSchema = z.infer<typeof UpdateWorkspaceSchema>;

/************************************************************************************
  List all workspaces
************************************************************************************/

export async function gtmListWorkspaces() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();

    const requestHeaders = {
      'Content-Type': 'application/json',
    };

    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    const options = {
      headers: requestHeaders,
    };

    // Fetching unique containers
    const containersData = await gtmListContainers();

    const workspacesPromises = containersData.map(async (container) => {
      const { accountId, containerId } = container;

      const workspaceUrl = `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`;

      const workspacesResp = await fetch(workspaceUrl, options);
      if (!workspacesResp.ok) {
        const responseText = await workspacesResp.text();
        console.error(
          `Error fetching workspaces for account ${accountId} ${containerId}: ${responseText}`
        );
        return []; // return an empty array on error
      }

      const workspacesData = await workspacesResp.json();
      return workspacesData.data || [];
    });

    const workspacesArrays = await Promise.all(workspacesPromises);
    const workspaces = workspacesArrays.flat();

    return workspaces;
  } catch (error) {
    console.error('Error fetching GTM containers:', error);
    throw error;
  }
}

/************************************************************************************
  Delete a single or multiple workspaces
************************************************************************************/
export async function deleteWorkspaces(
  accountId: string,
  workspaces: { containerId: string; workspaceId: string }[]
) {
  const cookie: any = cookies();
  const cookieHeader: any = headers().get('cookie');
  const baseUrl = getURL();

  console.log('accountId', accountId);
  console.log('workspaces', workspaces);

  const requestHeaders = {
    'Content-Type': 'application/json',
    ...(cookie && { Cookie: cookieHeader }),
  };

  const deletionPromises = workspaces.map(
    async ({ containerId, workspaceId }) => {
      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
        {
          method: 'DELETE',
          headers: requestHeaders,
        }
      );

      if (response.status === 403) {
        const parsedResponse = await response.json();
        if (parsedResponse.message === 'Feature limit reached') {
          throw new Error('Feature limit reached');
        }
      }

      if (!response.ok) {
        throw new Error(
          `Failed to delete workspace with ID ${workspaceId} in container with ID ${containerId}: ${response.status}`
        );
      }

      revalidatePath(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`
      );

      return { success: true, containerId, workspaceId };
    }
  );

  const results = await Promise.allSettled(deletionPromises);
  return results;
}

/************************************************************************************
  Create a single container or multiple containers
************************************************************************************/
export async function createWorkspaces(formData: FormCreateSchema) {
  try {
    const cookie: any = cookies();
    const cookieHeader: any = headers().get('cookie');
    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Map<string, string>();

    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });
    console.log('plainDataArray', plainDataArray);

    // Now pass plainDataArray to CreateWorkspaceSchema.safeParse within an object under the key 'forms'
    const validationResult = CreateWorkspaceSchema.safeParse({
      forms: plainDataArray,
    });

    console.log('validationResult', validationResult);

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
        accountId: formData.accountId,
        workspaceId: formData.workspaceId,
        name: formData.name,
        description: formData.description,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(cookie && { Cookie: cookieHeader }),
    };

    const featureLimitReachedWorkspaces: string[] = [];

    const createPromises = forms.map(async (workspaceData) => {
      const { accountId, description, containerId, name } = workspaceData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        description: description,
        containerId: containerId,
        accountId: accountId,
        name: name,
      };

      accountIdsToRevalidate.set(accountId, containerId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`,
        {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const createdWorkspace = await response.json();

      if (response.status === 403) {
        if (createdWorkspace.message === 'Feature limit reached') {
          featureLimitReachedWorkspaces.push(workspaceData.name);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to create workspace(s) with name ${workspaceData.name} in account ${workspaceData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to create',
        };
      }

      return { success: true, createdWorkspace };
    });

    const results = await Promise.all(createPromises);

    if (featureLimitReachedWorkspaces.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for workspaces: ${featureLimitReachedWorkspaces.join(
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
      accountIdsToRevalidate.forEach((accountId, containerId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`
        );
      });
      return {
        success: true,
        limitReached: false,
        createdWorkspaces: results
          .filter((r) => r.success)
          .map((r) => r.createdWorkspace),
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
  Udpate a single container or multiple containers
************************************************************************************/
export async function updateWorkspaces(formData: FormUpdateSchema) {
  try {
    const cookie: any = cookies();
    const cookieHeader: any = headers().get('cookie');
    const baseUrl = getURL();
    const errors: string[] = [];

    let accountIdsToRevalidate = new Map<string, string>();

    const forms: any[] = [];

    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });
    console.log('plainDataArray', plainDataArray);

    // Now pass plainDataArray to UpdateWorkspaceSchema.safeParse within an object under the key 'forms'
    const validationResult = UpdateWorkspaceSchema.safeParse({
      forms: plainDataArray,
    });

    console.log('validationResult', validationResult);

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
        accountId: formData.accountId,
        workspaceId: formData.workspaceId,
        name: formData.name,
        description: formData.description,
        containerId: formData.containerId,
      });
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(cookie && { Cookie: cookieHeader }),
    };

    const featureLimitReachedWorkspaces: string[] = [];

    const updatePromises = forms.map(async (workspaceData) => {
      const { accountId, description, containerId, name, workspaceId } =
        workspaceData; // Destructure from the current object

      // Initialize payload with a flexible type
      const payload: { [key: string]: any } = {
        description: description,
        containerId: containerId,
        accountId: accountId,
        name: name,
        workspaceId: workspaceId,
      };

      accountIdsToRevalidate.set(accountId, containerId);

      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
        {
          method: 'PATCH',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        }
      );

      const updatedWorkspace = await response.json();

      if (response.status === 403) {
        if (updatedWorkspace.message === 'Feature limit reached') {
          featureLimitReachedWorkspaces.push(workspaceData.name);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (!response.ok) {
        errors.push(
          `Failed to create workspace(s) with name ${workspaceData.name} in account ${workspaceData.accountId}: ${response.status}`
        );

        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to create',
        };
      }

      return { success: true, updatedWorkspace };
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReachedWorkspaces.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for workspaces: ${featureLimitReachedWorkspaces.join(
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
      accountIdsToRevalidate.forEach((accountId, containerId) => {
        revalidatePath(
          `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`
        );
      });
      return {
        success: true,
        limitReached: false,
        createdWorkspaces: results
          .filter((r) => r.success)
          .map((r) => r.updatedWorkspace),
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

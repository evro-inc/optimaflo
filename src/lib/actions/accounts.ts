'use server';
import { currentUser } from '@clerk/nextjs';
import { limiter } from '../bottleneck';
import { gtmRateLimit } from '../redis/rateLimits';
import { UpdateAccountSchema } from '../schemas/accounts';
import { z } from 'zod';
import { getURL } from '../helpers';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

type FormUpdateSchema = z.infer<typeof UpdateAccountSchema>;

// Separate out the logic to list GTM accounts into its own function
export async function listGtmAccounts(accessToken: string) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const user = await currentUser();
  const userId = user?.id as string;

  if (!user) return NextResponse.json({ error: 'User not found' });

  while (retries < MAX_RETRIES) {
    try {
      await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      let data;
      await limiter.schedule(async () => {
        const url = `https://www.googleapis.com/tagmanager/v2/accounts`;
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
        data = responseBody.account;
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
  throw new Error('Maximum retries reached without a successful response.');
}

export async function updateAccounts(formData: FormUpdateSchema, accessToken: string) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'User not found' });

    const baseUrl = getURL();
    const errors: string[] = [];
    const forms: any[] = [];
    const plainDataArray = formData.forms.map((fd) => {
      return Object.fromEntries(Object.keys(fd).map((key) => [key, fd[key]]));
    });

    const validationResult = UpdateAccountSchema.safeParse({
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
      return { error: formattedErrorMessage };
    }

    validationResult.data.forms.forEach((form) => {
      forms.push(form);
    });

    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const featureLimitReached: string[] = [];

    const updatePromises = forms.map(async (form) => {
      const payload = {
        accountId: form.accountId,
        name: form.name,
      };
      const response = await fetch(
        `${baseUrl}/api/dashboard/gtm/accounts/${forms}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: requestHeaders,
        }
      );

      if (response.status === 403) {
        const updatedAccount = await response.json();
        if (updatedAccount.message === 'Feature limit reached') {
          featureLimitReached.push(form.name);
          return {
            success: false,
            errorCode: 403,
            message: 'Feature limit reached',
          };
        }
      }

      if (response.ok) {
        // Revalidate the path for the updated workspace
        revalidatePath('/dashboard/gtm/accounts');

        const resText = await response.json();

        return { success: true, resText };
      } else {
        errors.push(
          `Failed to update workspace with name ${form.name} in account ${form.accountId}: ${response.status}`
        );
        return {
          success: false,
          errorCode: response.status,
          message: 'Failed to update',
        };
      }
    });

    const results = await Promise.all(updatePromises);

    if (featureLimitReached.length > 0) {
      return {
        success: false,
        limitReached: true,
        message: `Feature limit reached for workspaces: ${featureLimitReached.join(
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
      return {
        success: true,
        limitReached: false,
        updatedWorkspaces: results
          .filter((r) => r.success)
          .map((r) => r.resText),
      };
    }
  } catch (error) {
    console.error('Error in updateAccounts:', error);
    throw error;
  }
}

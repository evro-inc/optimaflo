'use server';
import { getURL } from '@/src/lib/helpers';
import logger from '@/src/lib/logger';
import { headers } from 'next/headers';

export async function gtmListAccounts() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();
    const url = `${baseUrl}/api/dashboard/gtm/accounts`;

    // Define headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      cache: 'no-store',
    };

    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    const options = {
      headers: requestHeaders,
    };

    const resp = await fetch(url, options);

    const responseText = await resp.text();

    // Check if the response is OK and parse the JSON
    if (!resp.ok) {
      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Response: ${responseText}`
      );
    }

    const gtmData = JSON.parse(responseText);
    return gtmData;
  } catch (error) {
    logger.error('Error fetching GTM accounts:', error);
    throw error; // re-throw the error so it can be caught and handled by the calling function
  }
}

/* export async function gtmUpdateAccounts(accountId: string, newName: string) {
  try {
    const baseUrl = process.env.LOCAL_SITE_URL;
    const url = `${baseUrl}/api/dashboard/gtm/accounts${accountId}`;

    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId,
        name: newName,
      }),
    };

    const resp = await fetch(url, options);

    const responseText = await resp.text();

    // Check if the response is OK and parse the JSON
    if (!resp.ok) {
      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Response: ${responseText}`
      );
    }

    const contentType = resp.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Expected JSON, but received ${contentType}`
      );
    }

    const gtmData = JSON.parse(responseText);
    return gtmData;
  } catch (error) {
    console.error('Error fetching GTM accounts:', error);
    throw error; // re-throw the error so it can be caught and handled by the calling function
  }
} */

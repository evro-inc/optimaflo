'use server';
import { getURL } from '@/src/lib/helpers';
import logger from '@/src/lib/logger';
import { headers } from 'next/headers';

export async function gtmListAccounts() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();
    const url = `${baseUrl}api/dashboard/gtm/accounts`;

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
        `${resp.status} ${resp.statusText}. Response: ${responseText}. Request: ${url}`
      );
    }

    const gtmData = JSON.parse(responseText);
    return gtmData;
  } catch (error) {
    logger.error('Error fetching GTM accounts:', error);
    throw error; // re-throw the error so it can be caught and handled by the calling function
  }
}

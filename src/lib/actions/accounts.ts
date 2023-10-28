'use server';
import { getURL } from '@/src/lib/helpers';
import logger from '@/src/lib/logger';

export async function gtmListAccounts() {
  try {
    const baseUrl = getURL();
    const url = `${baseUrl}api/dashboard/gtm/accounts`;

    const resp = await fetch(url);

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

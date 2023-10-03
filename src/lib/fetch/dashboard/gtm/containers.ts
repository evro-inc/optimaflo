'use server';
import { getURL } from '@/src/lib/helpers';
import { headers } from 'next/headers';

export async function gtmListContainers() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();
    const url = `${baseUrl}/api/dashboard/gtm/accounts`;

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

    // Check if the response is OK
    if (!resp.ok) {
      const responseText = await resp.text();
      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Response: ${responseText}`
      );
    }

    const gtmData = await resp.json(); // Parse the JSON response
    const accountIds = gtmData.data.map((container) => container.accountId); // Extract accountIds

    // for each account id in accountIds, fetch the containers
    const containers = await Promise.all(
      accountIds.map(async (accountId) => {
        try {
          const url = `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`;
          const resp = await fetch(url, options);

          if (!resp.ok) {
            const responseText = await resp.text();
            console.error(
              `Error fetching containers for account ${accountId}: ${responseText}`
            );
            return null; // return null or some default value
          }

          const containers = await resp.json();
          return containers.data;
        } catch (error) {
          console.error(
            `Error fetching containers for account ${accountId}: ${error}`
          );
          return null; // return null or some default value
        }
      })
    );

    // Filter out nulls and flatten the array of arrays
    const flattenedContainers = containers.filter(Boolean).flat();

    return flattenedContainers;
  } catch (error) {
    console.error('Error fetching GTM containers:', error);
    throw error; // re-throw the error so it can be caught and handled by the calling function
  }
}

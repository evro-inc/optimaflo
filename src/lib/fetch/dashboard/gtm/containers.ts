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
    if (!resp.ok) {
      const responseText = await resp.text();
      throw new Error(
        `Error: ${resp.status} ${resp.statusText}. Response: ${responseText}`
      );
    }

    const gtmData = await resp.json();
    const accountIds = gtmData.data.map((container) => container.accountId);

    const containersPromises = accountIds.map(async (accountId) => {
      const containersUrl = `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers`;

      const containersResp = await fetch(containersUrl, options);
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

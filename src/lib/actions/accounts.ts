'use server';
import { getURL } from '@/src/lib/helpers';
import logger from '@/src/lib/logger';

export async function gtmListAccounts() {
  try {
    const baseUrl = getURL();
    const url = `${baseUrl}/api/dashboard/gtm/accounts`;    

    const resp = await fetch(url, {
        next: { revalidate: 10 },
      });

    console.log('resp', resp);
    
    if (!resp.ok) {
      const rawResponse = await resp.text();
      console.error('Raw response:', rawResponse);
      // Handle non-OK responses here
    }    

    const responseText = await resp.json();
    
    console.log('responseText', responseText);
    

    return responseText;
  } catch (error) {
    logger.error('Error fetching GTM accounts:', error);
    throw error; // re-throw the error so it can be caught and handled by the calling function
  }
}

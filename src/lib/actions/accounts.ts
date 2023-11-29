'use server';
import { limiter } from '../bottleneck';
import { gtmRateLimit } from '../redis/rateLimits';


// Separate out the logic to list GTM accounts into its own function
export async function listGtmAccounts(userId: string, accessToken: string) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

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



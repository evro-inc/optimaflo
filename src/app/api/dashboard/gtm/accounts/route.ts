import { NextResponse } from 'next/server';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { limiter } from '@/src/lib/bottleneck';
import { ValidationError } from '@/src/lib/exceptions';
import { auth, clerkClient } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

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

      return {
        data: data,
        errors: null,
      };
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

// Refactored GET handler
export async function GET() {
  const { userId }: { userId: string | null; getToken: any } = auth();

  if (!userId) return notFound();

  try {
    const accessToken = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );

    if (!accessToken) {
      // Handle the case where accessToken is null
      // e.g., return an error response or prompt re-authentication
      return new NextResponse(
        JSON.stringify({ error: 'Access token not found' }),
        {
          status: 401, // Unauthorized
        }
      );
    }

    const response = await listGtmAccounts(userId, accessToken[0].token);

    const getResult = NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

    return getResult;
  } catch (error: any) {
    if (error instanceof ValidationError) {
      console.error('Validation Error: ', error.message);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

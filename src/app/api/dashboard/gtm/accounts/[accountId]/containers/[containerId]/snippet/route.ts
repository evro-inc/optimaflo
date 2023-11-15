import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import logger from '@/src/lib/logger';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const accountId = params.accountId;
    const containerId = params.containerId;

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
    });
    // Validate the accountId against the schema
    const { error } = schema.validate({ accountId, containerId });

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const userId = session?.user?.id;

    // using userId get accessToken from prisma account table
    const user = await prisma.account.findFirst({
      where: {
        userId: userId,
      },
    });

    const accessToken = user?.access_token;

    if (!accessToken) {
      // If the access token is null or undefined, return an error response
      return new NextResponse(
        JSON.stringify({ message: 'Access token is missing' }),
        {
          status: 401,
        }
      );
    }

    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      try {
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          // If the data is not in the cache, fetch it from the API
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          // List GTM built-in variables
          const res = await gtm.accounts.containers.snippet({
            path: `accounts/${accountId}/containers/${containerId}`,
          });

          const data = res.data;

          const response = {
            data: data.snippet,

            errors: null,
          };

          // Return the response as JSON

          const jsonString = JSON.stringify(response, null, 2);

          logger.debug('DEBUG RESPONSE: ', jsonString);

          return NextResponse.json(response, {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          });
        } else {
          // If we've hit the rate limit, throw an error
          throw new Error('Rate limit exceeded');
        }
      } catch (error: unknown) {
        if (isErrorWithStatus(error) && error.status === 429) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (retries === MAX_RETRIES) {
            throw new QuotaLimitError();
          }
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

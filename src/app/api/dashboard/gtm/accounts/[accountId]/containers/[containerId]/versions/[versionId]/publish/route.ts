import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';
import { useSession } from '@clerk/nextjs';

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
      versionId?: string;
    };
  }
) {
      const {session} = useSession();

  try {

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      userId: session?.user?.id,
      accountId: params.accountId,
      containerId: params.containerId,
      versionId: params.versionId,
    };

    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string()
        .pattern(/^\d{8}$/)
        .required(),
      versionId: Joi.string()
        .pattern(/^\d{1,3}$/)
        .required(),
    });

    // Validate the parameters against the schema
    const { error } = schema.validate(paramsJOI);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const { userId } = paramsJOI;

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

    // Fetch subscription data for the user
    const subscriptionData = await prisma.subscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!subscriptionData) {
      return new NextResponse(
        JSON.stringify({ message: 'Subscription data not found' }),
        {
          status: 403,
        }
      );
    }

    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: 'GTMVersions', // Replace with the actual feature name
        },
        Subscription: {
          userId: userId, // Assuming Subscription model has a userId field
        },
      },
      include: {
        Feature: true,
        Subscription: true,
      },
    });

    if (
      !tierLimitRecord ||
      tierLimitRecord.createUsage >= tierLimitRecord.createLimit
    ) {
      return new NextResponse(
        JSON.stringify({ message: 'Feature limit reached' }),
        {
          status: 403,
        }
      );
    }

    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      try {
        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          // If we haven't hit the rate limit, proceed with the API request

          // Set the user's access token
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          const publish = await gtm.accounts.containers.versions.publish({
            path: `accounts/${params.accountId}/containers/${params.containerId}/versions/${params.versionId}`,
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              createUsage: {
                increment: 1,
              },
            },
          });

          const response = {
            data: publish.data,
            meta: {
              totalResults: 1,
            },
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

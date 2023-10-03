/* eslint-disable no-unused-vars */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth/[...nextauth]/route';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';
import { limiter } from '@/src/lib/bottleneck';
import {
  getAccessToken,
  handleError,
  validateSchema,
} from '@/src/lib/fetch/apiUtils';

// Get all containers for a given account
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    // Extract query parameters from the URL
    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';
    const accountId = params.accountId;

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      pageNumber,
      limit,
      sort,
      order,
      userId: session?.user?.id,
      accountId,
    };

    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id', 'unitAmount', 'currency').required(),
      order: Joi.string().valid('asc', 'desc').required(),
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
    });

    // Validate the parameters against the schema
    await validateSchema(schema, paramsJOI);

    const { userId } = paramsJOI;

    const accessToken = await getAccessToken(userId);

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
          let res: any;
          await limiter.schedule(async () => {
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

            res = await gtm.accounts.containers.list({
              parent: `accounts/${accountId}`,
            });
          });

          const total = res.data.container?.length || 0;

          const response = {
            data: res.data.container,
            meta: {
              total,
              pageNumber,
              totalPages: Math.ceil(total / limit),
              pageSize: limit,
            },
            errors: null,
          };

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
    return handleError(error);
  }
}

// Create a new container
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
    };
  }
) {
  try {
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const session = await getServerSession(authOptions);
    const body = JSON.parse(await request.text());

    // Extract query parameters from the URL
    const accountId = body.accountId;

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      userId: session?.user?.id,
      accountId,
      name: body.name,
      usageContext: [body.usageContext],
      domainName: body.domainName,
      notes: body.notes,
    };

    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      name: Joi.string().required(),
      usageContext: Joi.array().items(Joi.string().required()).required(),

      /* usageContext: Joi.string().valid('WEB', 'ANDROID', 'IOS').required(), */
      // domainName as list of strings
      domainName: Joi.array().items(Joi.string().required()).optional(),
      // notes as string
      notes: Joi.string().allow('').optional(),
    });

    // Validate the parameters against the schema
    await validateSchema(schema, paramsJOI);

    const { userId, name, usageContext, domainName, notes } = paramsJOI;

    const accessToken = await getAccessToken(userId);

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
          name: 'GTMContainer',
        },
        Subscription: {
          userId: userId,
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
    let success = false;
    let delay = 1000;

    while (retries < MAX_RETRIES && !success) {
      try {
        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          let updatedContainers: any;

          await limiter.schedule(async () => {
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

            const res = {
              name: name,
              usageContext: usageContext,
              domainName: domainName,
              notes: notes,
            };

            await gtm.accounts.containers.create({
              parent: `accounts/${accountId}`,
              requestBody: res,
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
            // After creating the new container, fetch the updated list of containers
            updatedContainers = await gtm.accounts.containers.list({
              parent: `accounts/${accountId}`,
            });
          });

          const total = updatedContainers.data.container?.length || 0;

          const response = {
            data: updatedContainers.data.container,
            meta: {
              total,
              pageNumber: 1,
              totalPages: Math.ceil(total / limit),
              pageSize: limit,
            },
            errors: null,
          };

          const jsonString = JSON.stringify(response, null, 2);

          logger.debug('DEBUG RESPONSE: ', jsonString);
          success = true;

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
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          // Log the rate limit error and wait before retrying
          console.warn('Rate limit exceeded. Retrying...');
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2; // Exponential backoff
          retries++;
        } else {
          throw error;
        }
      }
      if (!success) {
        // Handle the case where the API call was not successful after MAX_RETRIES
        throw new QuotaLimitError();
      }
    }
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return handleError(error);
  }
}

/* eslint-disable no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError, ValidationError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';

import { limiter } from '@/src/lib/bottleneck';
import { handleError } from '@/src/lib/fetch/apiUtils';
import { PostParams, ResultType } from '@/src/lib/types/types';
import { auth, clerkClient, currentUser, useSession } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmContainers } from '@/src/lib/fetch/dashboard/actions/ga/properties';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { revalidatePath } from 'next/cache';

/************************************************************************************
 * GET UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the GET parameters
************************************************************************************/
async function validateGetParams(params) {
  const schema = Joi.object({
    pageNumber: Joi.number().integer().min(1).required(),
    limit: Joi.number().integer().min(1).max(100).required(),
    sort: Joi.string().valid('id', 'unitAmount', 'currency').required(),
    order: Joi.string().valid('asc', 'desc').required(),
    accountIds: Joi.array()
      .items(Joi.string().pattern(/^\d{10}$/))
      .required(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return value; // return the validated parameters when validation passes
}

/************************************************************************************
 * POST UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the POST parameters
************************************************************************************/
async function validatePostParams(params: any): Promise<PostParams> {
  const schema = Joi.object({
    accountId: Joi.string().required(),
    name: Joi.string().required(),
    usageContext: Joi.array()
      .items(Joi.string().valid('web', 'iosSdk5', 'androidSdk5'))
      .required(),
    domainName: Joi.array().items(Joi.string().required()).optional(),
    notes: Joi.string().allow('').optional(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    throw new ValidationError(`Validation Error: ${error.message}`);
  }

  return value;
}

/************************************************************************************
  Function to create a new GTM container
************************************************************************************/
async function createGtmContainer(
  userId: string,
  accessToken: string,
  accountId: string,
  name: string,
  usageContext: string[],
  domainName: string,
  notes: string,
  limit: number
): Promise<any> {
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

      if (remaining > 0) {
        let updatedContainers: any;

        await limiter.schedule(async () => {
          // Set the user's access token
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            throw new Error('OAuth2Client creation failed');
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          const res: tagmanager_v2.Schema$Container = {
            name: name,
            usageContext: usageContext,
            domainName: [domainName], // Adjusted this line to make domainName an array
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

        success = true;

        return response;
      } else {
        // If we've hit the rate limit, throw an error
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        // Log the rate limit error and wait before retrying
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2; // Exponential backoff
        retries++;
      } else {
        throw error;
      }
    }
  }

  if (!success) {
    // Handle the case where the API call was not successful after MAX_RETRIES
    throw new QuotaLimitError();
  }
}

/************************************************************************************
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  GET request handler
************************************************************************************/
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
    const { userId } = auth();
    if (!userId) return notFound();
    const accountId = params.accountId;

    // Call validateGetParams to validate the parameters
    await validateGetParams(accountId);
    const token = await currentUserOauthAccessToken(userId);

    // Call listGtmContainers for each accountId
    const allResults = await Promise.all(
      (accountId ? [accountId] : []).map(async (accountId) => {
        return await listGtmContainers(token[0].token, accountId);
      })
    );

    return NextResponse.json(allResults.flat(), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

/************************************************************************************
  POST request handler
************************************************************************************/
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
  const { userId } = auth();
  if (!userId) return notFound();

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;

    const body = JSON.parse(await request.text());

    // Extract query parameters from the URL

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      accountId: params.accountId,
      name: body.name,
      usageContext: [body.usageContext],
      domainName: body.domainName,
      notes: body.notes,
    };

    const validatedParams = await validatePostParams(paramsJOI);
    const { name, usageContext, domainName, notes, accountId } =
      validatedParams;
    const token = await currentUserOauthAccessToken(userId);

    // check tier limit
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

    // if tier limit is reached, return an error
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

    const response = await createGtmContainer(
      userId,
      token[0].token,
      accountId,
      name,
      usageContext,
      domainName,
      notes,
      limit
    );

    const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?

    revalidatePath(path);

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    // Return a 500 status code for internal server error
    return handleError(error);
  }
}

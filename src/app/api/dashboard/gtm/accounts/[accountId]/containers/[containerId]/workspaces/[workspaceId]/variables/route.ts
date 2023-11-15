/* eslint-disable no-unused-vars */

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
import { RequestParams } from '@/types/gtm';
import {
  firstPartyCookie,
  aev,
  constantString,
} from '@/src/lib/fetch/dashboard/gtm/variables';
import {
  aevValidationSchema,
  firstPartyCookieValidationSchema,
} from '@/src/lib/fetch/dashboard/gtm/validation';
import logger from '@/src/lib/logger';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
      workspaceId?: string;
    };
  }
) {
  try {
    const session = await getServerSession(authOptions);

    const accountId = params.accountId;
    const containerId = params.containerId;
    const workspaceId = params.workspaceId;

    const paramsJOI = {
      accountId: accountId,
      containerId: containerId,
      workspaceId: workspaceId,
    };

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string()
        .pattern(/^\d{8}$/)
        .required(),
      workspaceId: Joi.string()
        .pattern(/^\d{1,3}$/)
        .required(),
    });

    // Validate the accountId against the schema
    const { error } = schema.validate(paramsJOI);

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
          const res = await gtm.accounts.containers.workspaces.variables.list({
            parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
          });

          const data = [res.data];

          const response = {
            data: data,
            meta: {
              totalResults: data?.length ?? 0,
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

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: RequestParams;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Extract query parameters from the URL
    const accountId = body.accountId;
    const containerId = body.containerId;
    const workspaceId = body.workspaceId;
    const name = body.name;
    const type = body.type;
    let parameter = body.parameter;
    let formatValue = body.formatValue;

    switch (type) {
      case 'k':
        parameter = await firstPartyCookie(
          parameter.decodeCookie,
          parameter.cookieName,
          formatValue.convertNullToValue,
          formatValue.convertUndefinedToValue,
          formatValue.convertTrueToValue,
          formatValue.convertFalseToValue
        );
        break;
      case 'aev':
        ({ parameter, formatValue } = await aev(
          parameter.variableType,
          parameter.urlComponentType,
          parameter.extraParam,
          parameter.defaultValue,
          formatValue.convertNullToValue,
          formatValue.convertUndefinedToValue,
          formatValue.convertTrueToValue,
          formatValue.convertFalseToValue
        ));
        break;
      case 'c':
        parameter = await constantString(
          parameter.constantValue,
          parameter.variableName,
          formatValue.convertNull,
          formatValue.convertUndefined,
          formatValue.convertTrue,
          formatValue.convertFalse
        );
        break;
      default:
        throw new Error(`Unsupported type: ${type}`);
    }

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      userId: session?.user?.id,
      accountId,
      containerId,
      workspaceId,
      name,
      type,
      parameter,
    };

    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      workspaceId: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().required(),
      parameter: Joi.alternatives().conditional('type', {
        switch: [
          {
            is: 'k',
            then: firstPartyCookieValidationSchema,
          },
          {
            is: 'aev',
            then: aevValidationSchema,
          },
          {
            is: 'c',
            then: Joi.object({
              /* Define validation for 'c' type */
            }),
          },
        ],
        otherwise: Joi.object(), // Allow arbitrary properties if 'type' is not one of the expected values
      }),
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
          name: 'GTMVariables', // Replace with the actual feature name
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
          const BODY = {
            name: name,
            type: type,
            parameter: parameter,
          };

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

          const create =
            await gtm.accounts.containers.workspaces.variables.create({
              parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
              requestBody: BODY,
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
            data: create.data,

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

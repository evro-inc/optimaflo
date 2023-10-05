export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError, ValidationError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import logger from '@/src/lib/logger';
import { limiter } from '@/src/lib/bottleneck';
import {
  getAccessToken,
  handleError,
  validateSchema,
} from '@/src/lib/fetch/apiUtils';



/************************************************************************************
 * GET UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the GET parameters
************************************************************************************/
async function validateGetParams(params) {
    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
    });

  // Validate the accountId against the schema
  const { error, value } = schema.validate(params);

 if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return value;

}

/************************************************************************************
  Function to list or get one GTM containers
************************************************************************************/
async function fetchGtmData(userId: string, accessToken: string, accountId: string, containerId: string) {
  let retries = 0;
  const MAX_RETRIES = 3;
  
  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);
      if (remaining > 0) {
        let res;
        await limiter.schedule(async () => {
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            throw new Error('OAuth2Client creation failed');
          }
          const gtm = new tagmanager_v2.Tagmanager({ auth: oauth2Client });
          res = await gtm.accounts.containers.get({
            path: `accounts/${accountId}/containers/${containerId}`,
          });
        });
        return res.data;
      } else {
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
}


/************************************************************************************
 * PUT UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the PUT parameters
************************************************************************************/
async function validatePutParams(params: any) {
  const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      containerName: Joi.string().required(),
      usageContext: Joi.string().required(),
    });

  // Validate the accountId against the schema
  const { error, value } = schema.validate(params);

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return value;
}

/************************************************************************************
  Function to update GTM containers
************************************************************************************/
export async function updateGtmData(userId: string, accessToken: string, accountId: string, containerId: string, containerName: string, usageContext: string[]) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

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
            name: 'GTMContainer', // Replace with the actual feature name
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
        tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit
      ) {
        return new NextResponse(
          JSON.stringify({ message: 'Feature limit reached' }),
          {
            status: 403,
          }
        );
      }

      if (remaining > 0) {
        let res;

        await limiter.schedule(async () => {
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            throw new Error('OAuth2Client creation failed');
          }

          const gtm = new tagmanager_v2.Tagmanager({ auth: oauth2Client });

          res = await gtm.accounts.containers.update({
            path: `accounts/${accountId}/containers/${containerId}`,
            requestBody: {
              name: containerName,
              usageContext: usageContext,
            },
          });

          await prisma.tierLimit.update({
            where: {
              Feature: {
                name: 'GTMContainer',
              },
              Subscription: {
                userId: userId,
              },
            },
            data: {
              updateUsage: {
                increment: 1,
              },
            },
          });
        });

        const data = [res.data];

        const response = {
          data: data,
          meta: {
            totalResults: data?.length ?? 0,
          },
          errors: null,
        };

        return response;
      } else {
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
  }

  throw new Error('Max retries exceeded');  // Throwing an error if max retries are exceeded outside the while loop
}



/************************************************************************************
 * DELETE UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the DELETE parameters
************************************************************************************/


/************************************************************************************
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  GET request handler
************************************************************************************/
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
    const paramsJOI = {
      userId: session?.user?.id,
      accountId: params.accountId,
      containerId: params.containerId,
    };

    const validatedParams = await validateGetParams(paramsJOI);

    const { accountId, containerId, userId } = validatedParams;

    // using userId get accessToken from prisma account table
    const accessToken = await getAccessToken(userId);

    

    const data = fetchGtmData(userId, accessToken, accountId, containerId);

    return NextResponse.json(
      {
        data: data,
        meta: {
          totalResults: 1,
        },
        errors: null,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation Error: ', error.message);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    console.error('Error: ', error);
    // Return a 500 status code for internal server error
    return handleError(error);
  }
}

/************************************************************************************
  PUT/UPDATE request handler
************************************************************************************/
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Parse the request body
    const body = JSON.parse(await request.text());

    const paramsJOI = {
      userId: session?.user?.id,
      accountId: body.accountId,
      containerId: body.containerId,
      containerName: body.containerName,
      usageContext: body.usageContext,
    };

    const validateParams = await validatePutParams(paramsJOI);

    const { accountId, containerId, userId, containerName, usageContext } =
      validateParams;

    // using userId get accessToken from prisma account table
    const accessToken = await getAccessToken(userId);

    const data = await updateGtmData(
      userId,
      accessToken,
      accountId,
      containerId,
      containerName,
      usageContext
    );

    return NextResponse.json(
      {
        data: data,
        meta: {
          totalResults: 1,
        },
        errors: null,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return handleError(error);
  }
}

/************************************************************************************
  DELETE request handler
************************************************************************************/
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const url = request.url;
    const regex = /\/accounts\/([^/]+)\/containers\/([^/]+)/;
    const match = url.match(regex);

    if (!match || match.length < 3) {
      throw new Error('Invalid URL format');
    }

    const paramsJOI = {
      userId: session?.user?.id,
      accountId: match[1],
      containerId: match[2],
    };

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
    });

    // Validate the accountId against the schema
    await validateSchema(schema, paramsJOI);

    const { accountId, containerId, userId } = paramsJOI;

    // using userId get accessToken from prisma account table
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
          name: 'GTMContainer', // Replace with the actual feature name
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
      tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit
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
    let delay = 1000;

    while (retries < MAX_RETRIES) {
      try {
        // Wait for the rate limit to be available

        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          let res;

          await limiter.schedule(async () => {
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
            res = await gtm.accounts.containers.delete({
              path: `accounts/${accountId}/containers/${containerId}`,
            });
            console.log('res: ', res);
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              deleteUsage: {
                increment: 1,
              },
            },
          });

          const data = [res.data];

          const response = {
            data: data,
            meta: {
              totalResults: data?.length ?? 0,
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
      } catch (error: any) {
        if (error.code === 429 || error.status === 429) {
          // Log the rate limit error and wait before retrying
          console.warn('Rate limit exceeded. Retrying...');
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2; // Exponential backoff
          retries++;
        } else {
          // For other errors, you might want to break the loop and handle them differently
          console.error('An unexpected error occurred:', error);
          break;
        }
      }
    }
    // Handle the case where the loop exits without reaching max retries
    if (retries < MAX_RETRIES) {
      return NextResponse.json(
        { message: 'Operation completed without reaching max retries.' },
        { status: 200 }
      );
    }

    if (retries === MAX_RETRIES) {
      return NextResponse.json(
        { message: 'Max retries reached from GTM API.' },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return handleError(error);
  }
}

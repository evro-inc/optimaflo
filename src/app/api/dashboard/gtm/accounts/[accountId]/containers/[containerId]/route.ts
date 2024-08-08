import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { ValidationError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { limiter } from '@/src/lib/bottleneck';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';

/************************************************************************************
 * GET UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the GET parameters
************************************************************************************/
async function validateGetParams(params) {
  const schema = Joi.object({
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
async function fetchGtmData(
  userId: string,
  accessToken: string,
  accountId: string,
  containerId: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  while (retries < MAX_RETRIES) {
    const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let res = await limiter.schedule(async () => {
          const response = await fetch(url, { headers });

          if (!response.ok) {
            throw new Error(
              `HTTP error! status: ${response.status}. ${response.statusText}. ${response.url}`
            );
          }

          return await response.json();
        });

        return res; // This will be the container data
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
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

/************************************************************************************
 * PUT UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the PUT parameters
************************************************************************************/
async function validatePutParams(params: any) {
  const schema = Joi.object({
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
export async function updateGtmData(
  userId: string,
  accessToken: string,
  accountId: string,
  containerId: string,
  containerName: string,
  usageContext: string[]
) {
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
        return new NextResponse(JSON.stringify({ message: 'Subscription data not found' }), {
          status: 403,
        });
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

      if (!tierLimitRecord || tierLimitRecord.updateUsage >= tierLimitRecord.updateLimit) {
        return new NextResponse(JSON.stringify({ message: 'Feature limit reached' }), {
          status: 403,
        });
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
              id: tierLimitRecord.id,
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
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2; // Exponential backoff
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded'); // Throwing an error if max retries are exceeded outside the while loop
}

/************************************************************************************
 * DELETE UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the DELETE parameters
************************************************************************************/
async function validateDeleteParams(params: any) {
  const schema = Joi.object({
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
  Function to delete GTM containers
************************************************************************************/
async function deleteGtmData(
  userId: string,
  accessToken: string,
  accountId: string,
  containerId: string
) {
  try {
    // Fetch subscription data for the user
    const subscriptionData = await prisma.subscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!subscriptionData) {
      return new NextResponse(JSON.stringify({ message: 'Subscription data not found' }), {
        status: 403,
      });
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

    if (!tierLimitRecord || tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit) {
      return new NextResponse(JSON.stringify({ message: 'Feature limit reached' }), {
        status: 403,
      });
    }

    let retries = 0;
    const MAX_RETRIES = 3;
    let delay = 1000;

    while (retries < MAX_RETRIES) {
      try {
        // Wait for the rate limit to be available

        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

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
          const jitter = Math.random() * 200;
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));
          delay *= 2; // Exponential backoff
          retries++;
        } else {
          // For other errors, you might want to break the loop and handle them differently

          break;
        }
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

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
      accountId: string;
      containerId: string;
    };
  }
) {
  const user = await currentUser();
  if (!user) return notFound();

  const userId = user?.id;

  try {
    const paramsJOI = {
      accountId: params.accountId,
      containerId: params.containerId,
    };

    const validatedParams = await validateGetParams(paramsJOI);
    const { accountId, containerId } = validatedParams;

    const accessToken = await clerkClient().users.getUserOauthAccessToken(user?.id, 'oauth_google');

    const data = await fetchGtmData(userId, accesstoken.data[0].token, accountId, containerId);

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
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

/************************************************************************************
  PUT/UPDATE request handler
************************************************************************************/
export async function PUT(request: NextRequest) {
  const user = await currentUser();
  if (!user) return notFound();

  const userId = user?.id;

  try {
    // Parse the request body
    const body = JSON.parse(await request.text());

    const paramsJOI = {
      userId: user?.id,
      accountId: body.accountId,
      containerId: body.containerId,
      containerName: body.containerName,
      usageContext: body.usageContext,
    };

    const validateParams = await validatePutParams(paramsJOI);

    const { accountId, containerId, containerName, usageContext } = validateParams;

    // using userId get accessToken from prisma account table
    const accessToken = await clerkClient().users.getUserOauthAccessToken(user?.id, 'oauth_google');

    const data = await updateGtmData(
      userId,
      accesstoken.data[0].token,
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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

/************************************************************************************
  DELETE request handler
************************************************************************************/
export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) return notFound();
  const userId = user?.id;

  try {
    const url = request.url;
    const regex = /\/accounts\/([^/]+)\/containers\/([^/]+)/;
    const match = url.match(regex);

    if (!match || match.length < 3) {
      throw new Error('Invalid URL format');
    }

    const paramsJOI = {
      userId: user?.id,
      accountId: match[1],
      containerId: match[2],
    };

    const validateParams = await validateDeleteParams(paramsJOI);

    const { accountId, containerId } = validateParams;

    // using userId get accessToken from prisma account table
    const accessToken = await clerkClient().users.getUserOauthAccessToken(user?.id, 'oauth_google');

    const data = await deleteGtmData(userId, accesstoken.data[0].token, accountId, containerId);

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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

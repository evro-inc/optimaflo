import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError, ValidationError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { limiter } from '@/src/lib/bottleneck';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';

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
    workspaceId: Joi.string()
      .pattern(/^\d{1,3}$/)
      .required(),
  });

  // Validate the accountId against the schema
  const { error, value } = schema.validate(params);

  if (error) {
    // If validation fails, return a 400 Bad Request response
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
  return value;
}

/************************************************************************************
  Function to list or get one GTM workspace
************************************************************************************/
async function getWorkspace(
  userId: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  accessToken: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

      if (remaining > 0) {
        let data;
        await limiter.schedule(async () => {
          const response = await fetch(url, { headers });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
          }

          data = await response.json();
        });

        return data;
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
      workspaceId?: string;
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
      workspaceId: params.workspaceId,
    };

    const validateParams = await validateGetParams(paramsJOI);

    const { accountId, containerId, workspaceId } = validateParams;

    const accessToken = await currentUserOauthAccessToken(user?.id);

    const data = await getWorkspace(userId, accountId, containerId, workspaceId, accessToken);

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
  UPDATE/PATCH request handler
************************************************************************************/
export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) return notFound();
  const userId = user?.id;

  try {
    // Parse the request body
    const body = JSON.parse(await request.text());

    // Extract the account ID from the body
    const accountId = body.accountId;
    const containerId = body.containerId;
    const workspaceId = body.workspaceId;
    const name = body.name;
    const description = body.description;

    const paramsJOI = {
      accountId: accountId,
      containerId: containerId,
      workspaceId: workspaceId,
      name: name,
      description: description,
    };

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      workspaceId: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().required(),
    });

    // Validate the accountId against the schema
    const { error } = schema.validate(paramsJOI);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const accessToken = await currentUserOauthAccessToken(user?.id);

    if (!accessToken) {
      // If the access token is null or undefined, return an error response
      return new NextResponse(JSON.stringify({ message: 'Access token is missing' }), {
        status: 401,
      });
    }

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
          name: 'GTMWorkspaces', // Replace with the actual feature name
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

    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      try {
        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          // If we haven't hit the rate limit, proceed with the API request

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
          const res = await gtm.accounts.containers.workspaces.update({
            path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
            requestBody: {
              name: name,
              description: description,
            },
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              updateUsage: {
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

          const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?

          revalidatePath(path);

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
    const regex = /\/accounts\/([^/]+)\/containers\/([^/]+)\/workspaces\/([^/]+)/;
    const match = url.match(regex);

    if (!match || match.length < 3) {
      throw new Error('Invalid URL format');
    }

    const accountId = match[1];
    const containerId = match[2];
    const workspaceId = match[3];

    if (!accountId || !containerId || !workspaceId) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters.' }), {
        status: 400,
      });
    }

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      workspaceId: Joi.string().required(),
    });

    // Validate the accountId against the schema
    const { error } = schema.validate({
      accountId,
      containerId,
      workspaceId,
    });

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const accessToken = await currentUserOauthAccessToken(user?.id);

    if (!accessToken) {
      // If the access token is null or undefined, return an error response
      return new NextResponse(JSON.stringify({ message: 'Access token is missing' }), {
        status: 401,
      });
    }

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
          name: 'GTMWorkspaces', // Replace with the actual feature name
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

    if (!tierLimitRecord || tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit) {
      return new NextResponse(JSON.stringify({ message: 'Feature limit reached' }), {
        status: 403,
      });
    }

    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      try {
        // Check if we've hit the rate limit
        const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

        if (remaining > 0) {
          // If we haven't hit the rate limit, proceed with the API request

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
          const res = await gtm.accounts.containers.workspaces.delete({
            path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

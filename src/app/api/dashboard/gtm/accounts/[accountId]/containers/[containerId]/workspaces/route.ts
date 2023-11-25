import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import Joi from 'joi';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';
import { limiter } from '@/src/lib/bottleneck';
import { clerkClient, currentUser } from '@clerk/nextjs';
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
      .pattern(/^\d{8,10}$/)
      .required(),
    containerId: Joi.string().required(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    throw new Error(`Validation Error: ${error.message}`);
  }
  return value;
}

/************************************************************************************
  Function to list or get one GTM containers
************************************************************************************/
export async function listGtmWorkspaces(
  userId: string,
  accessToken: string,
  accountId: string,
  containerId: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        let data;
        await limiter.schedule(async () => {
          const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
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
          data = responseBody.workspace;
        });

        return {
          data: data,
          meta: {
            totalResults: data?.length ?? 0,
          },
          errors: null,
        };
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get workspaces...');
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
 * POST UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the POST parameters
************************************************************************************/
async function validatePostParams(params) {
  const schema = Joi.object({
    accountId: Joi.string()
      .pattern(/^\d{10}$/)
      .required(),
    containerId: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().optional(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    throw new Error(`Validation Error: ${error.message}`);
  }
  return value;
}

/************************************************************************************
  Function to create GTM containers
************************************************************************************/
async function createGtmWorkspace(
  accessToken,
  accountId,
  containerId,
  name,
  description
) {
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      name: name,
      description: description,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${response.status}. ${response.statusText}`
    );
  }

  return await response.json();
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

    const validateParams = await validateGetParams(paramsJOI);
    const { accountId, containerId } = validateParams;
    const accessToken = await clerkClient.users.getUserOauthAccessToken(
      user?.id,
      'oauth_google'
    );

    const data = await listGtmWorkspaces(
      userId,
      accessToken[0].token,
      accountId,
      containerId
    );

    return NextResponse.json(data, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      console.error('Validation Error: ', error.message);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    logger.error('Error: ', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

/************************************************************************************
  POST request handler
************************************************************************************/
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
    };
  }
) {
  const user = await currentUser();
  if (!user) return notFound();
  const userId = user?.id;

  try {
    const body = JSON.parse(await request.text());
    const postParams = {
      accountId: body.accountId,
      containerId: body.containerId,
      name: body.name,
      description: body.description,
    };

    const validatedParams = await validatePostParams(postParams);
    const accessToken = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );
    if (!accessToken) {
      return new NextResponse(
        JSON.stringify({ message: 'Access token is missing' }),
        {
          status: 401,
        }
      );
    }

    // Call the function to create a GTM workspace
    const workspaceData = await createGtmWorkspace(
      accessToken[0].token,
      validatedParams.accountId,
      validatedParams.containerId,
      validatedParams.name,
      validatedParams.description
    );

    return NextResponse.json(workspaceData, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    logger.error('Error: ', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

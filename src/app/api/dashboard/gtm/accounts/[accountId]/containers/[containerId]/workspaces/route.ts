import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import Joi from 'joi';

import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { listGtmWorkspaces } from '@/src/lib/fetch/dashboard/actions/gtm/workspaces';
import { redis } from '@/src/lib/redis/cache';
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
async function createGtmWorkspace(accessToken, accountId, containerId, name, description) {
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
  const headers = {
    Authorization: `Bearer ${token}`,
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
    throw new Error(`HTTP error! status: ${response.status}. ${response.statusText}`);
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
  const { userId } = auth();
  if (!userId) return notFound();

  try {
    const paramsJOI = {
      accountId: params.accountId,
      containerId: params.containerId,
    };
    const validateParams = await validateGetParams(paramsJOI);
    const { accountId, containerId } = validateParams;

    const cachedValue = await redis.get(`gtm:workspaces:${accountId}:${containerId}`);

    if (cachedValue) {
      return NextResponse.json(JSON.parse(cachedValue), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const token = await currentUserOauthAccessToken(userId);
    const data = await listGtmWorkspaces(token.data[0].token, accountId, containerId);

    redis.set(
      `gtm:workspaces:${accountId}:${containerId}`,
      JSON.stringify(data),
      'EX',
      60 * 60 * 24 * 7
    );

    return NextResponse.json(data, {
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
export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return notFound();
  const accessToken = await currentUserOauthAccessToken(userId);

  try {
    const body = JSON.parse(await request.text());
    const postParams = {
      accountId: body.accountId,
      containerId: body.containerId,
      name: body.name,
      description: body.description,
    };

    const validatedParams = await validatePostParams(postParams);

    if (!accessToken) {
      return new NextResponse(JSON.stringify({ message: 'Access token is missing' }), {
        status: 401,
      });
    }

    // Call the function to create a GTM workspace
    const workspaceData = await createGtmWorkspace(
      accesstoken.data[0].token,
      validatedParams.accountId,
      validatedParams.containerId,
      validatedParams.name,
      validatedParams.description
    );

    const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?

    revalidatePath(path);

    return NextResponse.json(workspaceData, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

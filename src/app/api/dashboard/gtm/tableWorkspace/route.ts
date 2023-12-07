import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import Joi from 'joi';
import logger from '@/src/lib/logger';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import {
  createWorkspaces,
  fetchAllWorkspaces,
} from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';
import { redis } from '@/src/lib/redis/cache';

import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { revalidatePath } from 'next/cache';

/************************************************************************************
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  GET request handler
************************************************************************************/
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();
    const token = await currentUserOauthAccessToken(userId);
    const cacheKey = `user:${userId}-gtm:all_workspaces`;
    const cachedWorkspaces = await redis.get(cacheKey);

    if (cachedWorkspaces) {
      return NextResponse.json(JSON.parse(cachedWorkspaces), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const allWorkspaces = await fetchAllWorkspaces(token[0].token);

    // Cache the combined workspaces
    await redis.set(
      cacheKey,
      JSON.stringify(allWorkspaces),
      'EX',
      60 * 60 * 24 * 7
    );

    return NextResponse.json(allWorkspaces, {
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

    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
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
  POST request handler
************************************************************************************/
export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return notFound();
  const token = await currentUserOauthAccessToken(userId);
  try {
    const body = JSON.parse(await request.text());
    const postParams = {
      accountId: body.accountId,
      containerId: body.containerId,
      name: body.name,
      description: body.description,
    };

    const validatedParams = await validatePostParams(postParams);

    // Call the function to create a GTM workspace
    const workspaceData = await createWorkspaces(
      validatedParams,
      token[0].token
    );

    const path = request.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?

    revalidatePath(path);

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

import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import Joi from 'joi';
import logger from '@/src/lib/logger';
import { clerkClient, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import {
  createWorkspaces,
  fetchAllWorkspaces,
} from '@/src/lib/actions/workspaces';
import { redis } from '@/src/lib/redis/cache';

import { WorkspaceType } from '@/src/lib/types/types';

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
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  GET request handler
************************************************************************************/
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;

    const cacheKey = `user:${userId}-gtm:all_workspaces`;
    const cachedWorkspaces = await redis.get(cacheKey);

    if (cachedWorkspaces) {
      return NextResponse.json(JSON.parse(cachedWorkspaces), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const allWorkspaces = await fetchAllWorkspaces();

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

    logger.error('Error: ', error);
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
    

    console.log('validatedParams table: ', validatedParams);
    

    // Call the function to create a GTM workspace
    const workspaceData = await createWorkspaces(validatedParams);

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

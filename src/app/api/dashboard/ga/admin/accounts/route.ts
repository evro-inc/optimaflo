import { NextRequest, NextResponse } from 'next/server';
import { analyticsadmin_v1beta } from 'googleapis';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';

import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import logger from '@/src/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Extract query parameters from the URL
    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, sort, order, userId: session?.user.id };

    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id', 'unitAmount', 'currency').required(),
      order: Joi.string().valid('asc', 'desc').required(),
      userId: Joi.string().uuid().required(),
    });

    // Validate the parameters against the schema
    const { error } = schema.validate(params);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const { userId } = params;

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
        // Set the user's access token
        const oauth2Client = createOAuth2Client(accessToken);

        if (!oauth2Client) {
          // If oauth2Client is null, return an error response or throw an error
          return NextResponse.error();
        }

        // Create a Tag Manager service client
        const ga4 = new analyticsadmin_v1beta.Analyticsadmin({
          auth: oauth2Client,
        });

        const res = await ga4.accounts.list();

        const total = res.data.accounts?.length ?? 0;

        const resAccounts = res.data.accounts;

        const response = {
          data: resAccounts,
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

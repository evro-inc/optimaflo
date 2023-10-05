import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';

// Separate out the validation logic into its own function
async function validateParams(params) {
  const schema = Joi.object({
    pageNumber: Joi.number().integer().min(1).required(),
    limit: Joi.number().integer().min(1).max(100).required(),
    sort: Joi.string().valid('id').required(),
    order: Joi.string().valid('asc', 'desc').required(),
    userId: Joi.string().uuid().required(),
  });

  const { error } = schema.validate(params);
  if (error) {
    throw new Error(`Validation Error: ${error.message}`);
  }
}

// Separate out the logic to list GTM accounts into its own function
async function listGtmAccounts(userId, accessToken, limit, pageNumber) {
  const oauth2Client = createOAuth2Client(accessToken);
  if (!oauth2Client) {
    throw new Error('OAuth2 client creation failed');
  }

  const gtm = new tagmanager_v2.Tagmanager({ auth: oauth2Client });

  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        const res = await gtm.accounts.list();

        const total = res.data.account?.length ?? 0;
        const resAccounts = res.data.account;

        return {
          data: resAccounts,
          meta: {
            total,
            pageNumber,
            totalPages: Math.ceil(total / limit),
            pageSize: limit,
          },
          errors: null,
        };
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error) {
      if (isErrorWithStatus(error) && error.status === 429) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 60000)); // 60 seconds wait before retrying
        if (retries === MAX_RETRIES) {
          throw new QuotaLimitError();
        }
      } else {
        throw error; // re-throw the error if it's not a 429 error
      }
    }
  }
}

// Refactored GET handler
export async function GET(request: NextRequest) {
  logger.info('GET request received');

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!session || !userId) {
      logger.warn('Session is undefined or null');
      throw new Error('Session retrieval failed');
    }

    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';

    const params = { pageNumber, limit, sort, order, userId };
    logger.info('Request parameters extracted', params);

    await validateParams(params); // Call the separate validation function

    const user = await prisma.account.findFirst({ where: { userId: userId } });
    const accessToken = user?.access_token;

    if (!accessToken) {
      throw new Error('Access token is missing');
    }

    const response = await listGtmAccounts(
      userId,
      accessToken,
      limit,
      pageNumber
    ); // Call the separate function to list GTM accounts

    return NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    logger.error('Error: ', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

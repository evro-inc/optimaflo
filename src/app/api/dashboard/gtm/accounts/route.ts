import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import Joi from 'joi';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';
import { limiter } from '@/src/lib/bottleneck';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';
import { ValidationError } from '@/src/lib/exceptions';

// Separate out the validation logic into its own function
async function validateParams(params) {
  const schema = Joi.object({
    pageNumber: Joi.number().integer().min(1).required(),
    limit: Joi.number().integer().min(1).max(100).required(),
    sort: Joi.string().valid('id').required(),
    order: Joi.string().valid('asc', 'desc').required(),
    userId: Joi.string().uuid().required(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    throw new Error(`Validation Error: ${error.message}`);
  }
  return value;
}

// Separate out the logic to list GTM accounts into its own function
async function listGtmAccounts(userId, accessToken, limit, pageNumber) {
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
        let res;
        await limiter.schedule(async () => {
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            throw new Error('OAuth2 client creation failed');
          }
          const gtm = new tagmanager_v2.Tagmanager({ auth: oauth2Client });
          res = await gtm.accounts.list();
        });

        const total = res.data.account?.length ?? 0;

        console.log('res.data.account', res.data.account);

        return {
          data: res.data.account,
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
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        console.warn('Rate limit exceeded. Retrying get accounts...');
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
// Refactored GET handler
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';

    const paramsJOI = {
      pageNumber,
      limit,
      sort,
      order,
      userId: session?.user?.id,
    };

    const validatedParams = await validateParams(paramsJOI);  
    const { userId } = validatedParams;
    const accessToken = await getAccessToken(userId);

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
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

/* GET request handler*/
export async function GET(request: NextRequest) {
  /* log the request  */
  logger.info('GET request received');

  try {
    /*get the session from the request*/
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    /*log the session*/
    if (session) {
      logger.info('Session retrieved', session);
    } else {
      logger.warn('Session is undefined or null');
    }

    /*get the parameters from the request*/
    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';

    /* save the parameters in a variable*/
    const params = {
      pageNumber,
      limit,
      sort,
      order,
      userId,
    };

    /*log the parameters*/
    logger.info('Request parameters extracted', params);

    /*validate the parameters*/
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id').required(),
      order: Joi.string().valid('asc', 'desc').required(),
      userId: Joi.string().uuid().required(),
    });

    const { error } = schema.validate(params);

    if (error) {
      logger.error('Request parameters validation failed', error);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    /* use the userId to get the user from the database*/
    const user = await prisma.account.findFirst({
      where: {
        userId: userId,
      },
    });

    /*log the user*/
    logger.info('User retrieved from database', user);

    /* save the accessToken in a variable, taken from the database*/
    const accessToken = user?.access_token;

    logger.info('Access token retrieved from database', accessToken);

    /* if the accessToken is missing, return an error*/
    if (!accessToken) {
      return new NextResponse(
        JSON.stringify({ message: 'Access token is missing' }),
        {
          status: 401,
        }
      );
    }

    /* Retry logic for rate limit */
    let retries = 0;
    const MAX_RETRIES = 3;

    /* block the request if the rate limit is exceeded*/
    while (retries < MAX_RETRIES) {
      try {
        /* get the remaining requests from the rate limit*/
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        /* if the remaining requests are more than 0, continue*/
        if (remaining > 0) {
          /* If cached data does not exist, create an oauth2Client with the accessToken*/
          const oauth2Client = createOAuth2Client(accessToken);

          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          /* create a new tagmanager object with the oauth2Client*/
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          /* list the accounts*/
          const res = await gtm.accounts.list();

          /* log the accounts*/
          logger.info('GTM accounts listed', res);

          /* save the total number of accounts in a variable*/
          const total = res.data.account?.length ?? 0;

          /* clean the accounts*/
          const resAccounts = res.data.account;

          /* save the cleaned accounts in a variable*/
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
          logger.info('Response created', response);

          const jsonString = JSON.stringify(response, null, 2);

          logger.debug('DEBUG RESPONSE: ', jsonString);

          return NextResponse.json(response, {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 200,
          });
        } else {
          /* if the remaining requests are 0, throw an error*/
          throw new Error('Rate limit exceeded');
        }
      } catch (error: unknown) {
        /* if the error is a 429 error, wait for 60 seconds and retry*/
        if (isErrorWithStatus(error) && error.status === 429) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, 60000));
          /* if the retries are more than 3, throw an error*/
          if (retries === MAX_RETRIES) {
            throw new QuotaLimitError();
          }
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    /* if there is an error, log the error*/
    logger.error('Error: ', error);

    /* return an error response*/
    return new NextResponse('OAuth2 client creation failed', { status: 500 });
  }
}

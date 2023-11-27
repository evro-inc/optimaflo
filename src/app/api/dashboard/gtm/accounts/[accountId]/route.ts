import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import logger from '@/src/lib/logger';
import { clerkClient, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

/************************************************************************************
 * PATCH UTILITY FUNCTIONS
 ************************************************************************************/
/************************************************************************************
  Validate the PATCH parameters
************************************************************************************/
async function validatePatchParams(params) {
  const schema = Joi.object({
    accountId: Joi.string()
      .pattern(/^\d{8,10}$/)
      .required(),
    name: Joi.string().required(),
  });

  const { error, value } = schema.validate(params);
  if (error) {
    throw new Error(`Validation Error: ${error.message}`);
  }
  return value;
}
/************************************************************************************
  Function to udpate GTM accounts
************************************************************************************/
async function PatchGtmAccount(accessToken, accountId, name, userId) {
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  let retries = 0;
  const MAX_RETRIES = 3;

  while (retries < MAX_RETRIES) {
    try {
      // Check if we've hit the rate limit
      const { remaining } = await gtmRateLimit.blockUntilReady(
        `user:${userId}`,
        1000
      );

      if (remaining > 0) {
        const response = await fetch(url, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify({
            name: name,
          }),
        });

        console.log('response: ', response);
        

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status}. ${response.statusText}`
          );
        }

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
    };
  }
) {
  const user = await currentUser();
  if (!user) return notFound();
  const userId = user?.id;

  try {
    const { accountId: accountId } = params;
    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
    });
    // Validate the accountId against the schema
    const { error } = schema.validate({ accountId });

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const accessToken = await clerkClient.users.getUserOauthAccessToken(
      user?.id,
      'oauth_google'
    );

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
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          // If the data is not in the cache, fetch it from the API
          const oauth2Client = createOAuth2Client(accessToken[0].token);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          // List GTM built-in variables
          const res = await gtm.accounts.get({
            path: `accounts/${accountId}`,
          });

          const resAccounts = [res.data];

          const response = {
            data: resAccounts,
            meta: {
              totalResults: resAccounts?.length,
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
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

/************************************************************************************
  PATCH request handler
************************************************************************************/
export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) return notFound();

  const userId = user?.id;

  try {
    // Parse the request body
    const body = JSON.parse(await request.text());

    // Extract the account ID from the body
    const { accountId, name } = body;

    const params = {
      accountId: body.accountId,
      name: body.name,
    };

    const validatedParams = await validatePatchParams(params);
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

    const accountData = await PatchGtmAccount(
      accessToken[0].token,
      validatedParams.accountId,
      validatedParams.name,
      userId
    );

    return NextResponse.json(accountData, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

import { NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { limiter } from '@/src/lib/bottleneck';

/************************************************************************************
  Function to combine GTM containers
************************************************************************************/
export async function combineGtmData(
  userId: string,
  accountId: string,
  containerId: string,
  containerIdToCombine: string,
  accessToken: string
) {
  let retries = 0;
  const MAX_RETRIES = 3;
  let delay = 1000;

  while (retries < MAX_RETRIES) {
    try {
      const { remaining } = await gtmRateLimit.blockUntilReady(`user:${userId}`, 1000);

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
            name: 'GTMContainer', // Replace with the actual feature name
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

      if (remaining > 0) {
        let res;

        await limiter.schedule(async () => {
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            throw new Error('OAuth2Client creation failed');
          }

          const gtm = new tagmanager_v2.Tagmanager({ auth: oauth2Client });

          res = await gtm.accounts.containers.combine({
            allowUserPermissionFeatureUpdate: true,
            containerId: containerIdToCombine,
            path: `accounts/${accountId}/containers/${containerId}:combine`,
            settingSource: 'other',
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
              Feature: {
                name: 'GTMContainer',
              },
              Subscription: {
                userId: userId,
              },
            },
            data: {
              updateUsage: {
                increment: 1,
              },
            },
          });
        });

        const data = res.data;

        const response = {
          data: data,
          meta: {
            totalResults: data?.length ?? 0,
          },
          errors: null,
        };

        return response;
      } else {
        throw new Error('Rate limit exceeded');
      }
    } catch (error: any) {
      if (error.code === 429 || error.status === 429) {
        // Log the rate limit error and wait before retrying
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2; // Exponential backoff
        retries++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded'); // Throwing an error if max retries are exceeded outside the while loop
}

/************************************************************************************
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  POST request handler
************************************************************************************/
/* export async function POST(request: NextRequest) {
  const { session } = useSession();

  try {
    // Parse the request body
    const body = JSON.parse(await request.text());

    const paramsJOI = {
      userId: session?.user?.id,
      accountId: body.accountId,
      containerId: body.containerId,
      containerIdToCombine: body.containerIdToCombine,
    };

    const validateParams = await validatePostParams(paramsJOI);

    const { accountId, containerId, containerIdToCombine, userId } = validateParams;

    const accessToken = await getAccessToken(userId);

    const data = await combineGtmData(
      userId,
      accessToken,
      accountId,
      containerId,
      containerIdToCombine
    );

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
    return handleError(error);
  }
} */

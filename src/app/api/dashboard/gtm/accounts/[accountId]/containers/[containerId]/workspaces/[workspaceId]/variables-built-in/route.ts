/* eslint-disable no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { tagmanager_v2 } from 'googleapis/build/src/apis/tagmanager/v2';
import { QuotaLimitError } from '@/src/lib/exceptions';
import { createOAuth2Client } from '@/src/lib/oauth2Client';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import { isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { gtmRateLimit } from '@/src/lib/redis/rateLimits';
import { BuiltInVariableType } from '@/src/types/gtm';

import { useSession } from '@clerk/nextjs';

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
      workspaceId?: string;
    };
  }
) {
  const { session } = useSession();

  try {
    const accountId = params.accountId;
    const containerId = params.containerId;
    const workspaceId = params.workspaceId;

    const paramsJOI = {
      accountId: accountId,
      containerId: containerId,
      workspaceId: workspaceId,
    };

    const schema = Joi.object({
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string()
        .pattern(/^\d{8}$/)
        .required(),
      workspaceId: Joi.string()
        .pattern(/^\d{1,3}$/)
        .required(),
    });

    // Validate the accountId against the schema
    const { error } = schema.validate(paramsJOI);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const userId = session?.user?.id;

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
        const { remaining } = await gtmRateLimit.blockUntilReady(
          `user:${userId}`,
          1000
        );

        if (remaining > 0) {
          // If the data is not in the cache, fetch it from the API
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          // List GTM built-in variables
          const res =
            await gtm.accounts.containers.workspaces.built_in_variables.list({
              parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
            });

          const data = [res.data];

          const response = {
            data: data,
            meta: {
              totalResults: data?.length ?? 0,
            },
            errors: null,
          };

          // Return the response as JSON

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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
      workspaceId?: string;
    };
  }
) {
  const { session } = useSession();

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const body = JSON.parse(await request.text());

    // Extract query parameters from the URL
    const accountId = body.accountId;
    const containerId = body.containerId;
    const workspaceId = body.workspaceId;
    const type: BuiltInVariableType = body.type;

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      userId: session?.user?.id,
      accountId,
      containerId,
      workspaceId,
      type,
    };

    const schema = Joi.object({
      userId: Joi.string().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      workspaceId: Joi.string().required(),
      type: Joi.string().required(),
    });

    // Validate the parameters against the schema
    const { error } = schema.validate(paramsJOI);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const { userId } = paramsJOI;

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

    // Fetch subscription data for the user
    const subscriptionData = await prisma.subscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!subscriptionData) {
      return new NextResponse(
        JSON.stringify({ message: 'Subscription data not found' }),
        {
          status: 403,
        }
      );
    }

    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: 'GTMVariablesBuiltIn', // Replace with the actual feature name
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

    if (
      !tierLimitRecord ||
      tierLimitRecord.createUsage >= tierLimitRecord.createLimit
    ) {
      return new NextResponse(
        JSON.stringify({ message: 'Feature limit reached' }),
        {
          status: 403,
        }
      );
    }

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
          // If we haven't hit the rate limit, proceed with the API request

          // Set the user's access token
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          await gtm.accounts.containers.workspaces.built_in_variables.create({
            parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
            type: [type],
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              createUsage: {
                increment: 1,
              },
            },
          });

          // After creating the new container, fetch the updated list of containers
          const updatedWorkspaces =
            await gtm.accounts.containers.workspaces.built_in_variables.list({
              parent: `accounts/${accountId}/containers/${containerId}`,
            });

          const total = updatedWorkspaces.data.builtInVariable?.length || 0;

          const response = {
            data: updatedWorkspaces.data.builtInVariable,
            meta: {
              total,
              pageNumber: 1,
              totalPages: Math.ceil(total / limit),
              pageSize: limit,
            },
            errors: null,
          };

          // Return the response as JSON

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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      accountId?: string;
      containerId?: string;
      workspaceId?: string;
    };
  }
) {
  const { session } = useSession();

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const body = JSON.parse(await request.text());

    // Extract query parameters from the URL
    const accountId = body.accountId;
    const containerId = body.containerId;
    const workspaceId = body.workspaceId;
    const type: BuiltInVariableType = body.type;

    // Create a JavaScript object with the extracted parameters
    const paramsJOI = {
      userId: session?.user?.id,
      accountId,
      containerId,
      workspaceId,
      type,
    };

    const schema = Joi.object({
      userId: Joi.string().required(),
      accountId: Joi.string()
        .pattern(/^\d{10}$/)
        .required(),
      containerId: Joi.string().required(),
      workspaceId: Joi.string().required(),
      type: Joi.string().required(),
    });

    // Validate the parameters against the schema
    const { error } = schema.validate(paramsJOI);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    const { userId } = paramsJOI;

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

    // Fetch subscription data for the user
    const subscriptionData = await prisma.subscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!subscriptionData) {
      return new NextResponse(
        JSON.stringify({ message: 'Subscription data not found' }),
        {
          status: 403,
        }
      );
    }

    const tierLimitRecord = await prisma.tierLimit.findFirst({
      where: {
        Feature: {
          name: 'GTMVariablesBuiltIn', // Replace with the actual feature name
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

    if (
      !tierLimitRecord ||
      tierLimitRecord.deleteUsage >= tierLimitRecord.deleteLimit
    ) {
      return new NextResponse(
        JSON.stringify({ message: 'Feature limit reached' }),
        {
          status: 403,
        }
      );
    }

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
          // If we haven't hit the rate limit, proceed with the API request

          // Set the user's access token
          const oauth2Client = createOAuth2Client(accessToken);
          if (!oauth2Client) {
            // If oauth2Client is null, return an error response or throw an error
            return NextResponse.error();
          }

          // Create a Tag Manager service client
          const gtm = new tagmanager_v2.Tagmanager({
            auth: oauth2Client,
          });

          await gtm.accounts.containers.workspaces.built_in_variables.delete({
            path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
            type: [type],
          });

          await prisma.tierLimit.update({
            where: {
              id: tierLimitRecord.id,
            },
            data: {
              deleteUsage: {
                increment: 1,
              },
            },
          });

          // After creating the new container, fetch the updated list of containers
          const updatedWorkspaces =
            await gtm.accounts.containers.workspaces.built_in_variables.list({
              parent: `accounts/${accountId}/containers/${containerId}`,
            });

          const total = updatedWorkspaces.data.builtInVariable?.length || 0;

          const response = {
            data: updatedWorkspaces.data.builtInVariable,
            meta: {
              total,
              pageNumber: 1,
              totalPages: Math.ceil(total / limit),
              pageSize: limit,
            },
            errors: null,
          };

          // Return the response as JSON

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
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

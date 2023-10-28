import { NextRequest, NextResponse } from 'next/server';
import { QuotaLimitError, ValidationError } from '@/src/lib/exceptions';
import { getServerSession } from 'next-auth/next';
import prisma from '@/src/lib/prisma';
import { fetchGtmSettings, isErrorWithStatus } from '@/src/lib/fetch/dashboard';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import logger from '@/src/lib/logger';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';
import { limiter } from '@/src/lib/bottleneck';
import { WorkspaceData } from '@/types/types';
import { revalidatePath } from 'next/cache';

async function fetchWithRetry(url: string, options, backoff) {
  try {
    const response = await fetch(url, options);
    if (response.status === 429) {
      let retryAfter: string | null = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 2000 : backoff;
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      return fetchWithRetry(url, options, backoff * 2);
    }
    return response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}
async function fetchWithLimiter(url: string, options, backoff = 1200) {
  return limiter.schedule(() => fetchWithRetry(url, options, backoff));
}

/************************************************************************************
  Function to list or get one GTM containers
************************************************************************************/
async function listGtmWorkspaces(userId: string, accessToken: string) {
  try {
    const gtmData = await prisma.gtm.findMany({
      where: { userId: userId },
      select: {
        accountId: true,
        containerId: true,
      },
    });

    const result: WorkspaceData[] = [];
    const failedItems: typeof gtmData = [];

    const allTasks = gtmData.map(async (item) => {
      const { accountId, containerId } = item;

      try {
        const [workspaceListRes] = await Promise.all([
          fetchWithLimiter(
            `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
              },
            }
          ),
        ]);

        const containerData = {
          accountId,
          containerId,
          workspaceId: workspaceListRes.workspace?.[0]?.workspaceId || '',
          workspaceName: workspaceListRes.workspace?.[0]?.name || '',
        };
        result.push(containerData);
      } catch (error: any) {
        console.error('Error processing item:', item, error.message);
        failedItems.push(item);
      }
    });

    await Promise.all(allTasks);

    // Retry failed items
    if (failedItems.length > 0) {
      console.log('Retrying failed items:', failedItems);
      const retryResults = await listGtmWorkspaces(userId, accessToken);
      result.push(...retryResults);
    }

    return result;
  } catch (error: any) {
    console.error('Error:', error.message);
    throw error;
  }
}

/************************************************************************************
 * REQUEST HANDLERS
 ************************************************************************************/
/************************************************************************************
  GET request handler
************************************************************************************/
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const userId = session?.user?.id as string;

    const accessToken = await getAccessToken(userId);

    const data = await listGtmWorkspaces(userId, accessToken);

    const path = request.nextUrl.searchParams.get('path') || '/';

    revalidatePath(path);

    return NextResponse.json(data);
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

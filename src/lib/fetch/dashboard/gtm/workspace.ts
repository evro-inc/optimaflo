'use server';
import { getURL } from '@/src/lib/helpers';
import prisma from '@/src/lib/prisma';
import { headers } from 'next/headers';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';

export async function gtmListWorkspaces() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const requestHeaders = {
      'Content-Type': 'application/json',
      cache: 'no-store',
    };

    if (cookie) {
      requestHeaders['Cookie'] = cookie;
    }

    const options = {
      headers: requestHeaders,
    };


    const gtmData = await prisma.gtm.findMany({
      where: {
        userId: userId,
      },
    })
    const collectedData = gtmData.map(entry => ({
      accountId: entry.accountId,
      containerId: entry.containerId,
      workspaceId: entry.workspaceId
    }));

    const workspacesPromises = collectedData.map(async (entry) => {
      const { accountId, containerId } = entry;

      const workspaceUrl = `${baseUrl}/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces`;

      const workspacesResp = await fetch(workspaceUrl, options);
      if (!workspacesResp.ok) {
        const responseText = await workspacesResp.text();
        console.error(
          `Error fetching workspaces for account ${accountId} ${containerId}: ${responseText}`
        );
        return []; // return an empty array on error
      }

      const workspacesData = await workspacesResp.json();
      return workspacesData.data || []; // return the whole data array
    });




    const workspacesArrays = await Promise.all(workspacesPromises);
    const workspaces = workspacesArrays.flat();

    console.log('workspaces', workspaces);
    

    return workspaces;
  } catch (error) {
    console.error('Error fetching GTM containers:', error);
    throw error;
  }
}
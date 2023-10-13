'use server';
import { getURL } from '@/src/lib/helpers';
import { headers } from 'next/headers';
import { gtmListContainers } from './containers';

export async function gtmListWorkspaces() {
  try {
    const cookie = headers().get('cookie');
    const baseUrl = getURL();

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


    // Fetching unique containers
    const containersData = await gtmListContainers();
    
    const workspacesPromises = containersData.map(async (container) => {
      const { accountId, containerId } = container;
      
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
      return workspacesData.data || [];
    });
    
    const workspacesArrays = await Promise.all(workspacesPromises);
    const workspaces = workspacesArrays.flat();
    
    return workspaces;
  } catch (error) {
    console.error('Error fetching GTM containers:', error);
    throw error;
  }
}

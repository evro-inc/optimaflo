import React from 'react';
import WorkspaceTable from '@/src/app/(dashboards)/dashboard/gtm/workspaces/table';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { fetchAllWorkspaces } from '@/src/lib/actions/workspaces';

async function getWorkspaces() {

  try {
    const { userId } = auth()   
    if(!userId) return notFound();
    const token = await currentUserOauthAccessToken(userId);    
    const workspaces = await fetchAllWorkspaces(token[0].token);
    return workspaces;
  } catch (error: any) {
    console.error('Error fetching workspaces:', error.message);
  }
}


export default async function WorkspacePage() {
  const { userId } = auth()
  if (!userId) return notFound();

  const data = await getWorkspaces();

  console.log('data', data);
  

  return (
    <>
       <WorkspaceTable workspaces={data} />
    </>
  );
}



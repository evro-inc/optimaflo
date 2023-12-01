import React from 'react';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';
import { notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs';

async function getWorkspaces() {
  const user = await currentUser();
  if (!user) return notFound();

  const { getToken } = auth();
  const accessToken = await getToken();

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(
    `http://localhost:3000/api/dashboard/gtm/tableWorkspace`,
    {
      method: 'GET',
      headers: headers,
    }
  );

  if (!res.ok) {
    console.log("res from page", res);
    
    throw new Error(`HTTP error! status: ${res.status}. ${res.statusText}`);
  }

  return await res.json();
}

export default async function WorkspacePage() {
  const user = await currentUser();
  if (!user) return notFound();

  const data = await getWorkspaces();

  return (
    <>
      <WorkspaceTable workspaces={data} />
    </>
  );
}

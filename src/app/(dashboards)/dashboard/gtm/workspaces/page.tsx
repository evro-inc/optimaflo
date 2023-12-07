import React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import WorkspaceTable from './server/table';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { fetchAllWorkspaces } from '@/src/lib/fetch/dashboard/gtm/actions/workspaces';

async function getWorkspaces() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();
    const token = await currentUserOauthAccessToken(userId);
    const workspaces = await fetchAllWorkspaces(token[0].token);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(workspaces.length / itemsPerPage);

    return { props: { workspaces, totalPages } };
  } catch (error: any) {
    console.error('Error fetching workspaces:', error.message);
    return { props: { workspaces: [], totalPages: 0 } }; // Return empty array and 0 totalPages in case of error
  }
}

export default async function WorkspacePage() {
  const { userId } = auth();
  if (!userId) return notFound();

  const data = await getWorkspaces();

  return (
    <>
      <WorkspaceTable workspaces={data.props.workspaces} />
    </>
  );
}

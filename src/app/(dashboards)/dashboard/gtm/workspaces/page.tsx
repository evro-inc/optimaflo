"use server";
import React from 'react';
import WorkspaceTable from '@/src/components/client/GTM/workspaces/table';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { gtmListContainers } from '@/src/lib/actions/containers';
import { gtmListWorkspaces } from '@/src/lib/actions/workspaces';

export default async function WorkspacePage() {
  const user = await currentUser();
  if (!user) return notFound();

  // Create an array of promises for containers and workspaces
  const combinedPromises = [
    await gtmListContainers(),
    await gtmListWorkspaces()
  ];

  // Resolve all promises
  const [containers, workspaces] = await Promise.all(combinedPromises);  

  return (
    <>
      <WorkspaceTable containers={containers} workspaces={workspaces} />
    </>
  );
}

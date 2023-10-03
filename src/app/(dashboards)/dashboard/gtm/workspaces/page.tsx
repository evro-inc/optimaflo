import type { Metadata } from 'next';
import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import FormCreateVariable from '@/src/components/client/GTM/variables/create';
import FormDeleteBuiltInVariable from '@/src/components/client/GTM/variables/delete';
import FormRevertBuiltInVariable from '@/src/components/client/GTM/variables/revert';
import FormUpdateVersion from '@/src/components/client/GTM/versions/update';
import FormCreateWorkspace from '@/src/components/client/GTM/workspaces/create';
import FormCreateVersionWorkspace from '@/src/components/client/GTM/workspaces/create-version';
import FormDeleteWorkspace from '@/src/components/client/GTM/workspaces/delete';
import FormPreviewWorkspace from '@/src/components/client/GTM/workspaces/preview';
import FormUpdateWorkspace from '@/src/components/client/GTM/workspaces/update';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Overview',
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  // if no session, redirect to home page
  if (!session) {
    redirect('/');
  }

  return (
    <div>
      <h1>Workspaces</h1>
      <FormCreateWorkspace />

      <h2>WS UPDATE</h2>
      <FormUpdateWorkspace />

      <h2>WS DELETE</h2>
      <FormDeleteWorkspace />

      <h2>WS CREATE VERSION</h2>
      <FormCreateVersionWorkspace />

      <h2>WS PREVIEW</h2>
      <FormPreviewWorkspace />

      <h2>CREATE BUILT IN VAR</h2>
      <FormDeleteBuiltInVariable />

      <h2>DELETE BUILT IN VAR</h2>
      <FormDeleteBuiltInVariable />

      <h2>REVERT BUILT IN VAR</h2>
      <FormRevertBuiltInVariable />

      <h1>Version</h1>
      <FormUpdateVersion />

      <h2>VERSION CREATE</h2>
      <FormCreateVariable />
    </div>
  );
}

'use client';

import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { revalidate } from '@/src/utils/server';
import { useUser } from '@clerk/nextjs';

function RefreshGTM({ path }) {
  const { user } = useUser();
  const userId = user?.id as string;

  const refreshAllCache = async () => {
    toast.info('Updating our systems. This may take a minute or two to update on screen.', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    const keys = [
      `gtm:accounts:userId:${userId}`,
      `gtm:containers:userId:${userId}`,
      `gtm:workspaces:userId:${userId}`,
      `gtm:tags:userId:${userId}`,
      `gtm:triggers:userId:${userId}`,
      `gtm:variables:userId:${userId}`,
      `gtm:versions:userId:${userId}`,
      `gtm:permissions:userId:${userId}`,
      `gtm:environments:userId:${userId}`,
      `gtm:builtInVariables:userId:${userId}`,
    ];

    // Ensure `path` is correctly formatted
    if (typeof path === 'string') {
      await revalidate(keys, `/dashboard/gtm/${path}`, userId, true);
    } else {
      console.error('Invalid path:', path);
    }
  };

  return (
    <div className="flex flex-row gap-4">
      <Button onClick={refreshAllCache}>Refresh GTM Cache</Button>
    </div>
  );
}

export default RefreshGTM;
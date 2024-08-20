'use client';

import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { revalidate } from '@/src/utils/server';
import { useUser } from '@clerk/nextjs';





function RefreshGA(gaPath) {
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
      `gtm:accountAccess:userId:${userId}`,
      `gtm:accounts:userId:${userId}`,
      `gtm:ads:userId:${userId}`,
      `gtm:audiences:userId:${userId}`,
      `gtm:conversionEvents:userId:${userId}`,
      `gtm:customDimensions:userId:${userId}`,
      `gtm:customMetrics:userId:${userId}`,
      `gtm:firebaseLinks:userId:${userId}`,
      `gtm:keyEvents:userId:${userId}`,
      `gtm:properties:userId:${userId}`,
      `gtm:propertyAccess:userId:${userId}`,
      `gtm:streams:userId:${userId}`,
    ];
    await revalidate(keys, `/dashboard/gtm/${gaPath}`, userId);
  };


  return (
    <div className="flex flex-row gap-4">
      <Button onClick={refreshAllCache}>Refresh GA Cache</Button>
    </div>
  );
}

export default RefreshGA;

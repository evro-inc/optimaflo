'use client';

import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { hardRevalidateFeatureCache } from '@/src/utils/server';
import { useUser } from '@clerk/nextjs';

function RefreshGA({ path }) {
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
      `ga:accountAccess:userId:${userId}`,
      `ga:accounts:userId:${userId}`,
      `ga:ads:userId:${userId}`,
      `ga:audiences:userId:${userId}`,
      `ga:conversionEvents:userId:${userId}`,
      `ga:customDimensions:userId:${userId}`,
      `ga:customMetrics:userId:${userId}`,
      `ga:firebaseLinks:userId:${userId}`,
      `ga:keyEvents:userId:${userId}`,
      `ga:properties:userId:${userId}`,
      `ga:propertyAccess:userId:${userId}`,
      `ga:streams:userId:${userId}`,
    ];

    // Ensure `path` is correctly formatted
    if (typeof path === 'string') {
      await hardRevalidateFeatureCache(keys, `/dashboard/ga/${path}`, userId);
    } else {
      console.error('Invalid path:', path);
    }
  };

  return (
    <div className="flex flex-row gap-4">
      <Button onClick={refreshAllCache}>Refresh GA Cache</Button>
    </div>
  );
}

export default RefreshGA;

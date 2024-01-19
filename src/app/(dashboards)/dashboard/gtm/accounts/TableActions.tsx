'use client';
import React from 'react';
import { revalidate } from '@/src/lib/helpers/server';
import Search from '@/src/components/client/UI/SearchInput';
import { toast } from 'sonner';
import { ReloadIcon } from '@radix-ui/react-icons';
import ButtonUpdate from '@/src/components/client/UI/ButtonUpdate';
import { Icon } from '@/src/components/client/Button/Button';

const TableActions = ({ userId }) => {
  const refreshAllCache = async () => {
    // Assuming you want to refresh cache for each workspace
    const redisRevalidate = `gtm:accounts:userId:${userId}`;

    await revalidate(redisRevalidate, '/dashboard/gtm/accounts');
    toast.info(
      'Updating our systems. This may take a minute or two to update on screen.',
      {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      }
    );
  };

  return (
    <div className="inline-flex gap-x-2">
      <Search placeholder={''} />
      <Icon variant="create" onClick={refreshAllCache} icon={<ReloadIcon />} />

      <ButtonUpdate />
    </div>
  );
};

export default TableActions;

import { useDispatch } from 'react-redux';
import { tierCreateLimit, tierUpdateLimit } from '../utils/server';
import { notFound, useRouter } from 'next/navigation';

import { toggleCreate, toggleUpdate } from '@/src/redux/globalSlice';
import { setIsLimitReached } from '@/src/redux/tableSlice';
import { toast } from 'sonner';

export function useCreateHookForm(userId, createTierLimitType, url) {
  const router = useRouter();
  try {
    const dispatch = useDispatch();

    const handleCreateClick = async () => {
      try {
        if (!userId) {
          return notFound();
        }
        const handleCreateLimit: any = await tierCreateLimit(userId, createTierLimitType);

        if (handleCreateLimit && handleCreateLimit.limitReached) {
          // Directly show the limit reached modal
          dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
        } else {
          // Otherwise, proceed with normal creation process
          router.push(url);
        }
      } catch (error: any) {
        throw new Error('Error in handleCreateClick:', error);
      }
    };

    return handleCreateClick;
  } catch (error: any) {
    throw new Error('Error in useHandleCreate:', error);
  }
}

export function useUpdateHookForm(userId, updateTierLimitType, url, rowSelectedCount) {
  const router = useRouter();
  try {
    const dispatch = useDispatch();

    const handleUpdateClick = async () => {
      try {
        if (!userId) {
          return notFound();
        }
        const handleUpdateLimit: any = await tierUpdateLimit(userId, updateTierLimitType);

        const limit = Number(handleUpdateLimit.updateLimit);
        const updateUsage = Number(handleUpdateLimit.updateUsage);
        const availableUpdateUsage = limit - updateUsage;

        if (rowSelectedCount > availableUpdateUsage) {
          toast.error(
            `Cannot update ${rowSelectedCount} streams as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`,
            {
              action: {
                label: 'Close',
                onClick: () => toast.dismiss(),
              },
            }
          );
        } else if (handleUpdateLimit && handleUpdateLimit.limitReached) {
          // Directly show the limit reached modal
          dispatch(setIsLimitReached(true)); // Assuming you have an action to explicitly set this
        } else {
          // Otherwise, proceed with normal creation process
          router.push(url);
        }
      } catch (error: any) {
        throw new Error('Error in handleUpdateClick:', error);
      }
    };

    return handleUpdateClick;
  } catch (error: any) {
    throw new Error('Error in useHandleUpdate:', error);
  }
}

import { useDispatch } from 'react-redux';
import { tierCreateLimit, tierUpdateLimit } from '../utils/server';
import { notFound, useRouter } from 'next/navigation';

import { toggleCreate, toggleUpdate } from '@/src/redux/globalSlice';
import { setIsLimitReached } from '@/src/redux/tableSlice';

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

export function useUpdateHookForm(userId, updateTierLimitType, url) {
  const router = useRouter();
  try {
    const dispatch = useDispatch();

    const handleUpdateClick = async () => {
      try {
        if (!userId) {
          return notFound();
        }
        const handleUpdateLimit: any = await tierUpdateLimit(userId, updateTierLimitType);

        if (handleUpdateLimit && handleUpdateLimit.limitReached) {
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

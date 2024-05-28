import { useDispatch } from 'react-redux';
import { tierCreateLimit, tierUpdateLimit } from '../utils/server';
import { notFound, useRouter } from 'next/navigation';
import { setIsLimitReached } from '@/src/redux/tableSlice';
import { toast } from 'sonner';

export function useCreateHookForm(
  userId: string,
  createTierLimitType: string | string[],
  url: string | string[]
) {
  const router = useRouter();
  const dispatch = useDispatch();

  return async () => {
    if (!userId) {
      return notFound(); // Ensure `notFound` is defined or imported appropriately
    }

    try {
      const createLimitTypes = Array.isArray(createTierLimitType)
        ? createTierLimitType
        : [createTierLimitType];
      const urls = Array.isArray(url) ? url : [url];

      let anyLimitReached = false;

      for (let i = 0; i < createLimitTypes.length; i++) {
        const handleCreateLimit: any = await tierCreateLimit(userId, createLimitTypes[i]); // Ensure tierCreateLimit is imported or defined

        if (handleCreateLimit && handleCreateLimit.limitReached) {
          anyLimitReached = true;
          dispatch(setIsLimitReached(true)); // Ensure setIsLimitReached is imported or defined
          break;
        }
      }

      if (!anyLimitReached) {
        // If no limits are reached, push to the first URL in the array
        router.push(Array.isArray(url) ? url[0] : url);
      }
    } catch (error) {
      toast.error('An error occurred while creating. Please try again.'); // Optionally, display an error message to the user
      throw error; // Rethrow or handle as needed
    }
  };
}

export function useUpdateHookForm(
  userId: string,
  updateTierLimitType: string,
  url: string,
  rowSelectedCount: number
) {
  const router = useRouter();
  const dispatch = useDispatch();

  return async () => {
    if (!userId) {
      return notFound(); // Make sure `notFound` is defined or imported appropriately
    }

    try {
      const handleUpdateLimit: any = await tierUpdateLimit(userId, updateTierLimitType); // Ensure tierUpdateLimit is imported or defined

      const limit = Number(handleUpdateLimit.updateLimit);
      const updateUsage = Number(handleUpdateLimit.updateUsage);
      const availableUpdateUsage = limit - updateUsage;

      if (rowSelectedCount > availableUpdateUsage) {
        toast.error(
          `Cannot update ${rowSelectedCount} streams as it exceeds the available limit. You have ${availableUpdateUsage} more creation(s) available.`
        );
        dispatch(setIsLimitReached(true));
      } else if (handleUpdateLimit && handleUpdateLimit.limitReached) {
        dispatch(setIsLimitReached(true));
      } else {
        router.push(url);
      }
    } catch (error) {
      throw error; // Rethrow or handle as needed
    }
  };
}

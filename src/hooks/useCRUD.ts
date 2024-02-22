import { useDispatch } from 'react-redux';
import { tierCreateLimit, tierUpdateLimit } from '../utils/server';
import { notFound, useRouter } from 'next/navigation';
import { setIsLimitReached } from '@/src/redux/tableSlice';
import { toast } from 'sonner';

export function useCreateHookForm(userId: string, createTierLimitType: string, url: string) {
  const router = useRouter();
  const dispatch = useDispatch();

  return async () => {
    if (!userId) {
      return notFound(); // Make sure `notFound` is defined or imported appropriately
    }

    try {
      const handleCreateLimit: any = await tierCreateLimit(userId, createTierLimitType); // Ensure tierCreateLimit is imported or defined

      if (handleCreateLimit && handleCreateLimit.limitReached) {
        dispatch(setIsLimitReached(true)); // Make sure setIsLimitReached is imported or defined
      } else {
        router.push(url);
      }
    } catch (error) {
      console.error('Error in creation process:', error);
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
      console.error('Error in update operation:', error);
      throw error; // Rethrow or handle as needed
    }
  };
}

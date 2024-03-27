'use client';

import { deleteGAConversionEvents } from '@/src/lib/fetch/dashboard/actions/ga/conversions';
import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { FeatureResponse, ConversionEvent } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting conversion events...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Use Object.values to get the values from the selectedRows object and cast them to GA4AccountType
    const ga4CustomDimensionToDelete = Object.values(
      selectedRows as Record<string, ConversionEvent>
    ).map((prop) => {
      return prop;
    });

    const customDimensionDisplayNames = ga4CustomDimensionToDelete.map((cd) => cd.eventName);

    const response: FeatureResponse = await deleteGAConversionEvents(
      new Set(ga4CustomDimensionToDelete),
      customDimensionDisplayNames
    );

    if (!response.success) {
      let message = response.message || 'An error occurred.';
      if (response.errors && response.errors.length > 0) {
        message = response.errors.join(', ');
      }
      if (response.notFoundError) {
        dispatch(setNotFoundError(true));
      }
      toast.error(message, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    } else {
      toast.success(response.message + ' The table will update shortly.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }

    if (response.limitReached) {
      dispatch(setIsLimitReached(true));
    }

    if (response.notFoundError) {
      const unsuccessfulResults = response.results.filter((result) => !result.success);
      dispatch(setErrorDetails(unsuccessfulResults));
      dispatch(setNotFoundError(true));
    }

    dispatch(clearSelectedRows());
    table.resetRowSelection({});
  };

  return handleDelete;
};

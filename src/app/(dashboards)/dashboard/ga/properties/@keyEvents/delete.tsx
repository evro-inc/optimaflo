'use client';

import { deleteGAKeyEvents } from '@/src/lib/fetch/dashboard/actions/ga/keyEvents';
import {
  clearSelectedRows,
  setErrorDetails,
  setIsLimitReached,
  setNotFoundError,
} from '@/src/redux/tableSlice';
import { FeatureResponse, KeyEventType } from '@/src/types/types';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useDeleteHook = (selectedRows, table) => {
  const dispatch = useDispatch();

  const handleDelete = async () => {
    toast('Deleting key events...', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });

    // Filter for deletable key events
    const deletableKeyEvents = Object.values(selectedRows as Record<string, KeyEventType>).filter(
      (keyEvent) => keyEvent.deletable
    );

    const nonDeletableKeyEvents = Object.values(
      selectedRows as Record<string, KeyEventType>
    ).filter((keyEvent) => !keyEvent.deletable);

    // Show toast for non-deletable key events
    if (nonDeletableKeyEvents.length > 0) {
      const nonDeletableEventNames = nonDeletableKeyEvents.map((ke) => ke.eventName).join(', ');
      toast.error(`These key events cannot be deleted: ${nonDeletableEventNames}`, {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
    }

    if (deletableKeyEvents.length === 0) {
      toast.error('No deletable key events selected.', {
        action: {
          label: 'Close',
          onClick: () => toast.dismiss(),
        },
      });
      return;
    }

    const customKeyEventNames = deletableKeyEvents.map((ke) => ke.eventName);

    const response: FeatureResponse = await deleteGAKeyEvents(
      new Set(deletableKeyEvents),
      customKeyEventNames
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

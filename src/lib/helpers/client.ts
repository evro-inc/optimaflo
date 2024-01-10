'use client';

import {
  clearSelectedRows,
  closeModal,
  openModal,
  selectTable,
  setError,
  setSelectedRows,
  toggleAllSelected,
} from '@/src/app/redux/tableSlice';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { usePaginate } from '../paginate';

export const handleGenericDelete = async (
  selectedRows,
  getUniqueIds,
  performDelete,
  dispatch,
  setIsLimitReached,
  setNotFoundError
) => {
  try {
    const uniqueIds = getUniqueIds(selectedRows);
    const deleteOperations = uniqueIds.map(async (id) => {
      return performDelete(id, selectedRows);
    });

    const responses = await Promise.all(deleteOperations);

    const limitReached = responses.some((response) => response.limitReached);
    const notFoundErrorOccurred = responses.some((response) =>
      response.results.some((result) => result.notFound)
    );

    dispatch(setIsLimitReached(limitReached));
    dispatch(setNotFoundError(notFoundErrorOccurred));
    dispatch(clearSelectedRows());
  } catch (error) {
    console.error(error);
  }
};

export const useRowSelection = (getIdFromItem) => {
  const dispatch = useDispatch();
  const { selectedRows, allSelected } = useSelector(selectTable);

  const toggleRow = (item) => {
    const itemId = getIdFromItem(item);
    const newSelectedRows = { ...selectedRows };

    if (newSelectedRows[itemId]) {
      delete newSelectedRows[itemId];
    } else {
      newSelectedRows[itemId] = item;
    }

    dispatch(setSelectedRows(newSelectedRows));
  };

  const toggleAll = (items) => {
    if (allSelected) {
      dispatch(setSelectedRows({}));
    } else {
      const newSelectedRows = items.reduce((acc, item) => {
        const itemId = getIdFromItem(item);
        acc[itemId] = item;
        return acc;
      }, {});

      dispatch(setSelectedRows(newSelectedRows));
    }

    dispatch(toggleAllSelected());
  };

  return { toggleRow, toggleAll, selectedRows, allSelected };
};

export const useModal = () => {
  const dispatch = useDispatch();
  const isModalOpen = useSelector((state: any) => state.table.isModalOpen);

  const openModalHandler = () => dispatch(openModal());
  const closeModalHandler = () => dispatch(closeModal());

  return {
    isModalOpen,
    openModal: openModalHandler,
    closeModal: closeModalHandler,
  };
};

export const useError = () => {
  const dispatch = useDispatch();
  const error = useSelector((state: any) => state.table.error);

  const setErrorState = (errorMessage) => dispatch(setError(errorMessage));
  const clearError = () => dispatch(setError(null));

  return { error, setErrorState, clearError };
};

export const useToggleAll = (items, getIdFromItem, dispatch, allSelected) => {
  const currentItems = usePaginate(items); // Get the current items for the page

  const toggleAll = () => {
    if (allSelected) {
      dispatch(setSelectedRows({}));
      dispatch(
        toggleAllSelected(
          // Use currentItems instead of items
          currentItems.length === Object.keys({}).length
        )
      );
    } else {
      const newSelectedRows = {};
      currentItems.forEach((item) => {
        // Use currentItems instead of items
        const itemId = getIdFromItem(item);
        newSelectedRows[itemId] = item;
      });
      dispatch(setSelectedRows(newSelectedRows));
      dispatch(
        toggleAllSelected(
          // Use currentItems instead of items
          currentItems.length === Object.keys(newSelectedRows).length
        )
      );
    }
  };

  return toggleAll;
};
export const handleRefreshCache = async (router, key, path) => {
  try {
    toast.info('Refreshing Cache', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
    const response = await fetch('/api/dashboard/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        path,
      }),
    });

    await response.json();
    router.refresh();
    toast.success('Cache Refreshed', {
      action: {
        label: 'Close',
        onClick: () => toast.dismiss(),
      },
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
  }
};

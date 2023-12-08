import { ContainerType } from '@/src/lib/types/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const tableSlice = createSlice({
  name: 'table',
  initialState: {
    selectedRows: {},
    currentPage: 1,
    itemsPerPage: 10,
    isLimitReached: false,
    allSelected: false,
    notFoundError: false,
  },
  reducers: {
    setSelectedRows: (
      state,
      action: PayloadAction<{ [key: string]: ContainerType }>
    ) => {
      state.selectedRows = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setIsLimitReached: (state, action: PayloadAction<boolean>) => {
      state.isLimitReached = action.payload;
    },
    clearSelectedRows: (state) => {
      state.selectedRows = {}; // Clear selectedRows by setting it to an empty object
    },
    toggleAllSelected: (state) => {
      // Add this reducer to toggle the allSelected state
      state.allSelected = !state.allSelected;
    },
    setNotFoundError: (state, action: PayloadAction<boolean>) => {
      state.notFoundError = action.payload;
    },
  },
});

export const {
  setSelectedRows,
  setCurrentPage,
  setIsLimitReached,
  clearSelectedRows,
  toggleAllSelected,
  setNotFoundError,
} = tableSlice.actions;

export const selectTable = (state) => state.table; // Adjust this if your state structure has changed
export default tableSlice.reducer;

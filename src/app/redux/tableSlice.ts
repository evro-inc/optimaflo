import { ContainerType } from '@/types/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const tableSlice = createSlice({
  name: 'table',
  initialState: {
    selectedRows: {},
    currentPage: 1,
    itemsPerPage: 10,
    isLimitReached: false,
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
    // Note: For itemsPerPage, since it's a constant, you may not need a reducer unless it's going to change.
    setIsLimitReached: (state, action: PayloadAction<boolean>) => {
      console.log('state', state);

      state.isLimitReached = action.payload;
    },
    clearSelectedRows: (state) => {
      state.selectedRows = {}; // Clear selectedRows by setting it to an empty object
    },
  },
});

export const {
  setSelectedRows,
  setCurrentPage,
  setIsLimitReached,
  clearSelectedRows,
} = tableSlice.actions;

export const selectTable = (state) => state.table; // Adjust this if your state structure has changed
export default tableSlice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {DeleteContainerResult} from '../../lib/types/types';  

export interface TableRow {
  id: string;
  [key: string]: any; // Allows for any additional properties
}

export interface TableState {
  selectedRows: { [id: string]: TableRow };
  currentPage: number;
  itemsPerPage: number;
  isLimitReached: boolean;
  allSelected: boolean;
  notFoundError: boolean;
  isModalOpen: boolean;
  error: string | null;
  errorDetails: DeleteContainerResult[];
}

const initialState: TableState = {
  selectedRows: {} as { [id: string]: TableRow },
  currentPage: 1,
  itemsPerPage: 10,
  isLimitReached: false,
  allSelected: false,
  notFoundError: false,
  isModalOpen: false,
  error: null,
  errorDetails: [], 
};

export const tableSlice = createSlice({
  name: 'table',
  initialState,
  reducers: {
    setSelectedRows: (
      state,
      action: PayloadAction<{ [id: string]: TableRow }>
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
    toggleAllSelected: (state, action) => {
      // Add this reducer to toggle the allSelected state
      state.allSelected =
        action.payload !== undefined ? action.payload : !state.allSelected;
    },
    setNotFoundError: (state, action: PayloadAction<boolean>) => {
      state.notFoundError = action.payload;
    },
    setErrorDetails: (state, action: PayloadAction<DeleteContainerResult[]>) => {
      state.errorDetails = action.payload;
    },
    openModal: (state) => {
      state.isModalOpen = true;
    },
    closeModal: (state) => {
      state.isModalOpen = false;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload; // Handle setting error state
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
  openModal,
  closeModal,
  setError,
  setErrorDetails,
} = tableSlice.actions;

export const selectTable = (state) => state.table; // Adjust this if your state structure has changed
export default tableSlice.reducer;

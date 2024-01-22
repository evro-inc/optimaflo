import { createSlice } from '@reduxjs/toolkit';

// Define a new slice for the sidebar
export const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    isOpen: true, // Initial state of the sidebar (open or closed)
  },
  reducers: {
    // Reducer to toggle the sidebar state
    toggleSidebar: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

// Export the toggleSidebar action for use in your components
export const { toggleSidebar } = sidebarSlice.actions;

// Selector to get the sidebar open/close state
export const selectIsSidebarOpen = (state) => state.sidebar.isOpen;

// Export the reducer
export default sidebarSlice.reducer;

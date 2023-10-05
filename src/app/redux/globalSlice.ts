import { createSlice } from '@reduxjs/toolkit';

export const globalSlice = createSlice({
  name: 'global',
  initialState: {
    isLoading: false,
    showUpdateContainer: false,
    showCreateContainer: false,
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    toggleUpdateContainer: (state) => {
      state.showUpdateContainer = !state.showUpdateContainer;
    },
    toggleCreateContainer: (state) => {
      state.showCreateContainer = !state.showCreateContainer;
    },
  },
});

export const { setLoading, toggleUpdateContainer, toggleCreateContainer } =
  globalSlice.actions;
export const selectGlobal = (state) => state.global;
export default globalSlice.reducer;

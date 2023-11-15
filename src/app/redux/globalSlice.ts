import { createSlice } from '@reduxjs/toolkit';

export const globalSlice = createSlice({
  name: 'global',
  initialState: {
    isLoading: false,
    showUpdateContainer: false,
    showCreateContainer: false,
    showCombineContainer: false,
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
    toggleCombineContainer: (state) => {
      state.showCombineContainer = !state.showCombineContainer;
    },
  },
});

export const {
  setLoading,
  toggleUpdateContainer,
  toggleCreateContainer,
  toggleCombineContainer,
} = globalSlice.actions;
export const selectGlobal = (state) => state.global;
export const selectIsLoading = (state) => state.global.isLoading;
export default globalSlice.reducer;

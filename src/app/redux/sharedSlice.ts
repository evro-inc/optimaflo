import { createSlice } from '@reduxjs/toolkit';

export const entitySlice = createSlice({
  name: 'entity',
  initialState: {
    isLoading: false,
    showUpdate: false,
    showCreate: false,
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    toggleUpdate: (state) => {
      state.showUpdate = !state.showUpdate;
    },
    toggleCreate: (state) => {
      state.showCreate = !state.showCreate;
    },
  },
});

export const { setLoading, toggleUpdate, toggleCreate } = entitySlice.actions;
export const selectEntity = (state) => state.entity;
export default entitySlice.reducer;

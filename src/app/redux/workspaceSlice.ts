import { createSlice } from '@reduxjs/toolkit';

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    isLoading: false,
    showUpdateWorkspace: false,
    showCreateWorkspace: false,
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    toggleUpdateWorkspace: (state) => {
      state.showUpdateWorkspace = !state.showUpdateWorkspace;
    },
    toggleCreateWorkspace: (state) => {
      state.showCreateWorkspace = !state.showCreateWorkspace;
    },
  },
});

export const { setLoading, toggleUpdateWorkspace, toggleCreateWorkspace } =
  workspaceSlice.actions;
export const selectWorkspace = (state) => state.workspace;
export default workspaceSlice.reducer;

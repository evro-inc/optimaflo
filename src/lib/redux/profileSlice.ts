import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProfileState {
  firstName: string;
  lastName: string;
  username: string;
  isDialogOpen: boolean;
}

const initialState: ProfileState = {
  firstName: '',
  lastName: '',
  username: '',
  isDialogOpen: false,
};

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setFirstName: (state, action: PayloadAction<string>) => {
      state.firstName = action.payload;
    },
    setLastName: (state, action: PayloadAction<string>) => {
      state.lastName = action.payload;
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    openDialog: (state) => {
      // Action to open the dialog
      state.isDialogOpen = true;
    },
    closeDialog: (state) => {
      // Action to close the dialog
      state.isDialogOpen = false;
    },
  },
});

export const {
  setFirstName,
  setLastName,
  setUsername,
  openDialog,
  closeDialog,
} = profileSlice.actions;

export default profileSlice.reducer;

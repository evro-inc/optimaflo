import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Exclude {
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
}

const initialState: Exclude = {
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setExcludeLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setExcludeError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    incrementExcludeStep: (state) => {
      state.currentStep += 1;
    },
    decrementExcludeStep: (state) => {
      state.currentStep -= 1;
    },
    setExcludeCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

export const {
  setExcludeLoading,
  setExcludeError,
  incrementExcludeStep,
  decrementExcludeStep,
  setExcludeCount,
} = formSlice.actions;

export default formSlice.reducer;

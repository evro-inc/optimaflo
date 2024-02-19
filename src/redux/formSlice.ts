import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FormState {
  formData: FormData | null;

  error: string | null;
  currentStep: number;
  streamCount: number;
}

const initialState: FormState = {
  formData: null,

  error: null,
  currentStep: 1,
  streamCount: 1,
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setFormData: (state, action: PayloadAction<FormData>) => {
      state.formData = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    incrementStep: (state) => {
      state.currentStep += 1;
    },
    decrementStep: (state) => {
      state.currentStep -= 1;
    },
    setStreamCount: (state, action: PayloadAction<number>) => {
      state.streamCount = action.payload;
    },
  },
});

export const {
  setFormData,

  setError,
  setCurrentStep,
  incrementStep,
  decrementStep,
  setStreamCount,
} = formSlice.actions;

export default formSlice.reducer;

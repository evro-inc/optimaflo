import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FormState {
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
}

const initialState: FormState = {
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
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
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

export const { setLoading, setError, setCurrentStep, incrementStep, decrementStep, setCount } =
  formSlice.actions;

export default formSlice.reducer;

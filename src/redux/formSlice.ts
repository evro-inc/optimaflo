import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CardIdentifier {
  id: string;
  type: string;
  parentId: string;
}

export interface FormIdentifier {
  id: string;
  type: string; // e.g., "simple", "sequence"
  parentId: string;
  cards?: CardIdentifier[];
}

interface FormState {
  formData: FormData | null;
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
  showForm: FormIdentifier[];
  showCard: CardIdentifier[];
  Or: FormIdentifier[];
}

const initialState: FormState = {
  formData: null,
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
  showForm: [],
  showCard: [],
  Or: [],
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setFormData: (state, action: PayloadAction<FormData>) => {
      state.formData = action.payload;
    },
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
    setShowForm: (state, action: PayloadAction<FormIdentifier[]>) => {
      state.showForm = action.payload;
    },
    removeForm: (state, action: PayloadAction<string>) => {
      state.showForm = state.showForm.filter((form) => form.id !== action.payload);
    },
    setShowCard: (state, action: PayloadAction<CardIdentifier[]>) => {
      state.showCard = action.payload;
    },
    removeCard: (state, action: PayloadAction<string>) => {
      state.showCard = state.showCard.filter((card) => card.id !== action.payload);
    },
    setOrForm: (state, action: PayloadAction<FormIdentifier[]>) => {
      state.Or = action.payload;
    },
    removeOrForm: (state, action: PayloadAction<string>) => {
      console.log('Current state:', state.Or); // Debug log
      console.log('Removing ID:', action.payload); // Debug log
      state.Or = state.Or.filter((orForm) => orForm.id !== action.payload);
    },
  },
});

export const {
  setFormData,
  setLoading,
  setError,
  setCurrentStep,
  incrementStep,
  decrementStep,
  setCount,
  setShowForm,
  removeForm,
  setShowCard,
  removeCard,
  setOrForm,
  removeOrForm,
} = formSlice.actions;

export default formSlice.reducer;

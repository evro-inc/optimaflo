import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ExcludeCardIdentifier {
  id: string;
  type: string;
  parentId: string;
}

export interface ExcludeStepIdentifier {
  id: string;
  type: string;
  parentId: string;
}

export interface ExcludeFormIdentifier {
  id: string;
  type: string;
  parentId: string;
  cards?: ExcludeCardIdentifier[];
}

export interface ExcludeParentIdentifier {
  id: string;
  type: string;
  parentId: string;
  forms?: ExcludeFormIdentifier[];
}

interface Exclude {
  formData: FormData | null;
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
  showParentForm: ExcludeParentIdentifier[];
  showSimpleForm: ExcludeFormIdentifier[];
  showSequenceForm: ExcludeFormIdentifier[];
  showCard: ExcludeCardIdentifier[];
  Or: ExcludeFormIdentifier[];
  showStep: ExcludeStepIdentifier[];
}

const initialState: Exclude = {
  formData: null,
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
  showParentForm: [],
  showSimpleForm: [],
  showSequenceForm: [],
  showCard: [],
  Or: [],
  showStep: [],
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    setExcludeFormData: (state, action: PayloadAction<FormData>) => {
      state.formData = action.payload;
    },
    setExcludeLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setExcludeError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setExcludeCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
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

    setExcludeParentForm: (state, action: PayloadAction<ExcludeParentIdentifier[]>) => {
      state.showParentForm = action.payload;
    },
    removeExcludeParentForm: (state, action: PayloadAction<string>) => {
      state.showParentForm = state.showParentForm.filter((form) => form.id !== action.payload);
    },

    setExcludeSimpleForm: (state, action: PayloadAction<ExcludeFormIdentifier[]>) => {
      state.showSimpleForm = action.payload;
    },
    removeExcludeSimpleForm: (state, action: PayloadAction<string>) => {
      state.showSimpleForm = state.showSimpleForm.filter((form) => form.id !== action.payload);
    },
    setExcludeSequenceForm: (state, action: PayloadAction<ExcludeFormIdentifier[]>) => {
      state.showSequenceForm = action.payload;
    },
    removeExcludeSequenceForm: (state, action: PayloadAction<string>) => {
      state.showSequenceForm = state.showSequenceForm.filter((form) => form.id !== action.payload);
    },
    setShowExcludeCard: (state, action: PayloadAction<ExcludeCardIdentifier[]>) => {
      state.showCard = action.payload;
    },
    removeExcludeCard: (state, action: PayloadAction<string>) => {
      state.showCard = state.showCard.filter((card) => card.id !== action.payload);
    },
    setExcludeOrForm: (state, action: PayloadAction<ExcludeFormIdentifier[]>) => {
      state.Or = action.payload;
    },
    removeExcludeOrForm: (state, action: PayloadAction<string>) => {
      console.log('Current state:', state.Or); // Debug log
      console.log('Removing ID:', action.payload); // Debug log
      state.Or = state.Or.filter((orForm) => orForm.id !== action.payload);
    },
    setShowExcludeStep: (state, action: PayloadAction<ExcludeStepIdentifier[]>) => {
      state.showStep = action.payload;
    },
    addExcludeStep: (state, action: PayloadAction<{ parentId: string }>) => {
      const newStep: ExcludeStepIdentifier = {
        id: crypto.randomUUID(), // Ensure you have a polyfill or alternative for environments without crypto
        type: 'step',
        parentId: action.payload.parentId,
      };
      state.showStep = [...state.showStep, newStep];
    },
    removeExcludeStep: (state, action: PayloadAction<string>) => {
      state.showStep = state.showStep.filter((step) => step.id !== action.payload);
    },
  },
});

export const {
  setExcludeFormData,
  setExcludeLoading,
  setExcludeError,
  setExcludeCurrentStep,
  incrementExcludeStep,
  decrementExcludeStep,
  setExcludeCount,
  setExcludeSimpleForm,
  removeExcludeSimpleForm,
  setExcludeSequenceForm,
  removeExcludeSequenceForm,
  setShowExcludeCard,
  removeExcludeCard,
  setExcludeOrForm,
  removeExcludeOrForm,
  setShowExcludeStep,
  addExcludeStep,
  removeExcludeStep,
  setExcludeParentForm,
  removeExcludeParentForm,
} = formSlice.actions;

export default formSlice.reducer;

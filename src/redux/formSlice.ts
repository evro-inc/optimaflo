import { createSlice, PayloadAction } from '@reduxjs/toolkit';


export interface CategoryItem {
  id: string;
  uiName: string;
  apiName: string;
  category: string;
}

interface Category {
  name: string;
  items: CategoryItem[];
}

// Add/Or Form Cards
export interface CardIdentifier {
  id: string;
  type: string;
  parentId: string;
}

export interface StepIdentifier {
  id: string;
  type: string; // "step"
  parentId: string;
  cards: CardIdentifier[];
}

export interface FormIdentifier {
  id: string;
  type: string; // e.g., "simple", "sequence"
  parentId: string;
  cards: CardIdentifier[];
  steps: StepIdentifier[];
}

interface FormState {
  formData: FormData | null;
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
  showSimpleForm: FormIdentifier[];
  showSequenceForm: FormIdentifier[];
  showCard: CardIdentifier[];
  showStep: StepIdentifier[];
  categories: Category[];
  selectedItems: CategoryItem[];
  selectedCategoryItems: CategoryItem[];
  localSelectedItems: CategoryItem[];
}

const initialState: FormState = {
  formData: null,
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
  showSimpleForm: [],
  showSequenceForm: [],
  showCard: [],
  showStep: [],
  categories: [],
  selectedItems: [],
  selectedCategoryItems: [],
  localSelectedItems: [],
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
    setShowSimpleForm: (state, action: PayloadAction<FormIdentifier[]>) => {
      state.showSimpleForm = action.payload;
    },
    removeSimpleForm: (state, action: PayloadAction<string>) => {
      state.showSimpleForm = state.showSimpleForm.filter((form) => form.id !== action.payload);
    },
    setShowSequenceForm: (state, action: PayloadAction<FormIdentifier[]>) => {
      state.showSequenceForm = action.payload;
    },
    removeSequenceForm: (state, action: PayloadAction<string>) => {
      state.showSequenceForm = state.showSequenceForm.filter((form) => form.id !== action.payload);
    },
    setShowCard: (state, action: PayloadAction<CardIdentifier[]>) => {
      state.showCard = action.payload;
    },
    removeCard: (state, action: PayloadAction<string>) => {
      state.showCard = state.showCard.filter((card) => card.id !== action.payload);
    },

    removeOrForm: (state, action: PayloadAction<string>) => {
      state.showCard = state.showCard.filter((orForm) => orForm.id !== action.payload);
    },
    setShowStep: (state, action: PayloadAction<StepIdentifier[]>) => {
      state.showStep = action.payload;
    },
    removeStep: (state, action: PayloadAction<string>) => {
      state.showStep = state.showStep.filter((step) => step.id !== action.payload);
    },


    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    addSelectedItem: (state, action: PayloadAction<CategoryItem>) => {
      state.selectedItems.push(action.payload);
    },
    removeSelectedItem: (state, action: PayloadAction<string>) => {
      state.selectedItems = state.selectedItems.filter(item => item.id !== action.payload);
    },

    setSelectedCategoryItems: (state, action: PayloadAction<CategoryItem[]>) => {
      state.selectedCategoryItems = action.payload;
    },


    setLocalSelectedItems: (state, action: PayloadAction<CategoryItem[]>) => {
      state.localSelectedItems = action.payload;
    },
    addLocalSelectedItem: (state, action: PayloadAction<CategoryItem>) => {
      state.localSelectedItems.push(action.payload);
    },
    removeLocalSelectedItem: (state, action: PayloadAction<string>) => {
      state.localSelectedItems = state.localSelectedItems.filter(item => item.id !== action.payload);
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
  setShowSimpleForm,
  setShowSequenceForm,
  removeSimpleForm,
  removeSequenceForm,
  setShowCard,
  removeCard,
  removeOrForm,
  setShowStep,
  removeStep,
  setCategories,
  addSelectedItem,
  removeSelectedItem,
  setSelectedCategoryItems,
  setLocalSelectedItems,
} = formSlice.actions;

export default formSlice.reducer;

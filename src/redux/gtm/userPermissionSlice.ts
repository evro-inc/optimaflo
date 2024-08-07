// formSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EmailAddress {
  emailAddress: string;
}

export interface Permission {
  accountId: string;
  accountAccess: { permission: string };
  containerAccess: Array<{ containerId: string; permission: string }>;
}

export interface FormData {
  emailAddresses: EmailAddress[];
  permissions: Permission[];
}

interface FormState {
  forms: FormData[];
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
}

const initialState: FormState = {
  forms: [
    {
      emailAddresses: [],
      permissions: [
        {
          accountId: '',
          accountAccess: { permission: '' },
          containerAccess: [{ containerId: '', permission: '' }],
        },
      ],
    },
  ],
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
};

const formSlice = createSlice({
  name: 'gtmUserPermission',
  initialState,
  reducers: {
    addForm: (state) => {
      state.forms.push({
        emailAddresses: [],
        permissions: [
          {
            accountId: '',
            accountAccess: { permission: '' },
            containerAccess: [{ containerId: '', permission: '' }],
          },
        ],
      });
    },
    removeForm: (state, action: PayloadAction<number>) => {
      state.forms.splice(action.payload, 1);
    },
    updateEmailAddresses: (state, action) => {
      const { formIndex, emailAddresses } = action.payload;
      state.forms = state.forms.map((form, index) =>
        index === formIndex ? { ...form, emailAddresses } : form
      );
    },
    updatePermissions: (
      state,
      action: PayloadAction<{ formIndex: number; permissions: Permission[] }>
    ) => {
      if (state.forms[action.payload.formIndex]) {
        state.forms[action.payload.formIndex].permissions = action.payload.permissions;
      }
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
  },
});

export const {
  addForm,
  removeForm,
  updateEmailAddresses,
  updatePermissions,
  setLoading,
  setError,
  setCurrentStep,
  incrementStep,
  decrementStep,
  setCount,
} = formSlice.actions;

export default formSlice.reducer;

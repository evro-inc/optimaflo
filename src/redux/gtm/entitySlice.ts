import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';

// Zod schema import
import { AccountContainerWorkspaceSchema } from '@/src/lib/schemas/gtm/variables';

// Type inference from Zod schema
type AccountContainerWorkspaceType = z.infer<typeof AccountContainerWorkspaceSchema>;

// Interface for the state
interface TableItem {
  accountId: string;
  accountName: string;
  containerId?: string;
  containerName?: string;
  workspaceId?: string;
  workspaceName?: string;
}

interface FormState {
  entities: AccountContainerWorkspaceType[];
  table: TableItem[]; // Add table property here
  loading: boolean;
  error: string | null;
  currentStep: number;
  count: number;
}

const initialState: FormState = {
  entities: [
    {
      accountId: '',
      containerId: '',
      workspaceId: '',
    },
  ],
  table: [], // Initialize table property
  loading: false,
  error: null,
  currentStep: 1,
  count: 1,
};

const formSlice = createSlice({
  name: 'gtmEntity',
  initialState,
  reducers: {
    addEntity: (state) => {
      state.entities.push({
        accountId: '',
        containerId: '',
        workspaceId: '',
      });
    },
    removeEntity: (state, action: PayloadAction<number>) => {
      state.entities.splice(action.payload, 1);
    },
    updateEntity: (
      state,
      action: PayloadAction<{
        entityIndex: number;
        data: Partial<AccountContainerWorkspaceType>;
      }>
    ) => {
      const { entityIndex, data } = action.payload;
      // Use Immer syntax to update the entity correctly
      Object.assign(state.entities[entityIndex], data);
    },
    setEntities: (state, action: PayloadAction<AccountContainerWorkspaceType[]>) => {
      // Create a set to track unique combinations
      const uniqueCombinationSet = new Set(
        state.entities.map((entity) =>
          JSON.stringify({
            accountId: entity.accountId,
            containerId: entity.containerId,
            workspaceId: entity.workspaceId,
          })
        )
      );

      // Filter out non-unique combinations from the payload
      const uniqueEntities = action.payload.filter((entity) => {
        const combinationString = JSON.stringify({
          accountId: entity.accountId,
          containerId: entity.containerId,
          workspaceId: entity.workspaceId,
        });
        if (!uniqueCombinationSet.has(combinationString)) {
          uniqueCombinationSet.add(combinationString);
          return true;
        }
        return false;
      });

      // Update the state with unique entities
      state.entities = [...state.entities, ...uniqueEntities];
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
  addEntity,
  removeEntity,
  updateEntity,
  setEntities,
  setLoading,
  setError,
  setCurrentStep,
  incrementStep,
  decrementStep,
  setCount,
} = formSlice.actions;

export default formSlice.reducer;

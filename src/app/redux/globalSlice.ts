import { createSlice } from '@reduxjs/toolkit';

export const globalSlice = createSlice({
  name: 'global',
  initialState: {
    isLoading: false,
    showUpdateContainer: false,
    showCreateContainer: false,
    showCombineContainer: false,
    accordionOpenItems: {},
  },
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    toggleUpdateContainer: (state) => {
      state.showUpdateContainer = !state.showUpdateContainer;
    },
    toggleCreateContainer: (state) => {
      state.showCreateContainer = !state.showCreateContainer;
    },
    toggleCombineContainer: (state) => {
      state.showCombineContainer = !state.showCombineContainer;
    },
    toggleAccordionItem: (state, action) => {
      const itemId = action.payload;
      if (state.accordionOpenItems[itemId]) {
        delete state.accordionOpenItems[itemId];
      } else {
        state.accordionOpenItems[itemId] = true;
      }
    },
  },
});

export const {
  setLoading,
  toggleUpdateContainer,
  toggleCreateContainer,
  toggleCombineContainer,
  toggleAccordionItem,
} = globalSlice.actions;

export const selectGlobal = (state) => state.global;
export const selectIsLoading = (state) => state.global.isLoading;
// Selector for accordion open items
export const selectAccordionOpenItems = (state) =>
  state.global.accordionOpenItems;

export default globalSlice.reducer;

'use client';
import { createSelector, createSlice } from '@reduxjs/toolkit';

// Update your slice to include isLoading
export const subscriberSlice = createSlice({
  name: 'subscriber',
  initialState: {
    subscription: null,
    isLoading: false, // Add isLoading to your initialState
  },
  reducers: {
    setSubscription: (state, action) => {
      state.subscription = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

// Export your new setLoading action
export const { setSubscription, setLoading } = subscriberSlice.actions;

// Update your selector to return the subscription and isLoading properties
export const selectSubscriber = createSelector(
  // First, define input selectors. These should return the pieces of state you care about.
  (state) => state.subscriber.subscription,
  (state) => state.subscriber.isLoading,
  // Then, define a result function. This function will receive the values
  // of the input selectors in the order they were listed.
  (subscription, isLoading) => ({
    subscription,
    isLoading,
  })
);

export default subscriberSlice.reducer;

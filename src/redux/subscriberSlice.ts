'use client';
import { createSlice } from '@reduxjs/toolkit';

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

export const selectSubscriptionState = (state) => state.subscriber;

export default subscriberSlice.reducer;

'use client';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import globalSlice from './globalSlice';
import subscriberReducer from './subscriberSlice';

const rootReducer = combineReducers({
  user: userReducer,
  global: globalSlice,
  subscriber: subscriberReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

'use client';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import globalSlice from './globalSlice';
import subscriberReducer from './subscriberSlice';
import tableSlice from './tableSlice';
import workspaceReducer from './workspaceSlice';

const rootReducer = combineReducers({
  user: userReducer,
  global: globalSlice,
  subscriber: subscriberReducer,
  table: tableSlice,
  workspace: workspaceReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});

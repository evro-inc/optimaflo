'use client';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import globalSlice from './globalSlice';
import subscriberReducer from './subscriberSlice';
import tableSlice from './tableSlice';
import workspaceReducer from './sharedSlice';
import sidebarReducer from './sidebarSlice';
import profileReducer from './profileSlice';

const rootReducer = combineReducers({
  user: userReducer,
  global: globalSlice,
  subscriber: subscriberReducer,
  table: tableSlice,
  entity: workspaceReducer,
  sidebar: sidebarReducer,
  profile: profileReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});
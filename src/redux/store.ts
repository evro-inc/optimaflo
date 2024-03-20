'use client';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import globalReducer from './globalSlice';
import subscriberReducer from './subscriberSlice';
import tableReducer from './tableSlice';
import workspaceReducer from './sharedSlice';
import sidebarReducer from './sidebarSlice';
import profileReducer from './profileSlice';
import formReducer from './formSlice';
import excludeFormReducer from './excludeFormSlice';

const rootReducer = combineReducers({
  user: userReducer,
  global: globalReducer,
  subscriber: subscriberReducer,
  table: tableReducer,
  entity: workspaceReducer,
  sidebar: sidebarReducer,
  profile: profileReducer,
  form: formReducer,
  excludeForm: excludeFormReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});
export type RootState = ReturnType<typeof store.getState>;

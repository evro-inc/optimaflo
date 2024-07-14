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
import gtmUserPermission from './gtm/userPermissionSlice';
import gtmEntity from './gtm/entitySlice';

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
  gtmUserPermission: gtmUserPermission,
  gtmEntity: gtmEntity,
});

export const store = configureStore({
  reducer: rootReducer,
});
export type RootState = ReturnType<typeof store.getState>;

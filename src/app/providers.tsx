/* eslint-disable no-undef */
'use client';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../lib/redux/store';

export const ReduxProvider = ({ children }) => {
    useEffect(() => {
    import('preline');
  }, []);
  return <Provider store={store}>{children}</Provider>;
};

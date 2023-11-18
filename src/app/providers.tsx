/* eslint-disable no-undef */
'use client';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { ClerkProvider } from '@clerk/nextjs';

type Props = {
  children: React.ReactNode;
};

export const Providers = ({ children }: Props) => {
  useEffect(() => {
    import('preline');
  }, []);
  return <ClerkProvider>{children}</ClerkProvider>;
};

export const ReduxProvider = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};
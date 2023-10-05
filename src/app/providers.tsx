/* eslint-disable no-undef */
'use client';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './redux/store';

type Props = {
  children: React.ReactNode;
};

export const Providers = ({ children }: Props) => {
  useEffect(() => {
    import('preline');
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
};

export const ReduxProvider = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};

// app/ClientWrapper.tsx
'use client';
import 'styles/main.css';
import 'styles/chrome-bug.css';

import { useEffect } from 'react';
import { MyUserContextProvider } from '@/src/lib/contextProvider';
import React from 'react';

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList?.remove('loading');
  }, []);

  return <MyUserContextProvider>{children}</MyUserContextProvider>;
}

'use client';

import { useSession } from '@clerk/nextjs';
import React from 'react';

export const User = () => {
  const { session } = useSession();
  return <pre>{JSON.stringify(session)}</pre>;
};

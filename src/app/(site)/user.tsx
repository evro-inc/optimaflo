'use client';

import { useSession } from 'next-auth/react';
import React from 'react';

export const User = () => {
  const { data: session } = useSession();
  return <pre>{JSON.stringify(session)}</pre>;
};

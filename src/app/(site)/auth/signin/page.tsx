'use client';
import React from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/src/components/client/Button/Button';

const LoginPage = () => {
  return (
    <>
      {/* ========== MAIN CONTENT ========== */}
      <main
        id="content"
        role="main"
        className="flex items-center justify-center h-screen"
      >
        <div className="text-center py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl text-white sm:text-4xl">Sign In / Sign Up</h1>
          <h2 className="mt-1 sm:mt-3 text-4xl font-bold text-white sm:text-6xl">
            <span className="bg-clip-text bg-gradient-to-tr from-blue-200 to-blue-800   text-transparent">
              OptimaFlo
            </span>
          </h2>
          <div className="pt-10 grid gap-4 w-full sm:inline-flex items-center justify-center">
            <Button
              variant="body"
              billingInterval={''}
              aria-label="Sign Up with Google"
              onClick={() =>
                signIn('google', {
                  callbackUrl: '/profile',
                })
              }
              text="Sign Up"
            />

            <Button
              variant="body"
              billingInterval={''}
              aria-label="Log in with Google"
              onClick={() =>
                signIn('google', {
                  callbackUrl: '/profile',
                })
              }
              text="Log in"
            />
          </div>
        </div>
      </main>
      {/* ========== END MAIN CONTENT ========== */}
    </>
  );
};

export default LoginPage;

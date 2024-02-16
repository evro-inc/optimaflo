'use client';
import { Suspense, useMemo } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '../../ui/button';

const getLinkModeClasses = (variant) => {
  switch (variant) {
    case 'body':
      return 'w-36 py-3 cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
    case 'bodyOffWhite':
      return 'w-36 py-3 cursor-pointer bg-offwhite-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-offwhite-700 font-medium px-0 sm:px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
    case 'link':
      return 'underline font-medium  transition duration-0 py-2 focus:rounded-full focus:bg-blue-50 w-20 rounded-full';

    case 'login':
      return 'w-36 py-3 cursor-pointer py-3 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-50 hover: font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100 lg:ml-3';
    case 'signUp':
      return 'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
    case 'warning':
      return ' hover:rounded-full hover:bg-blue-50 hover: transition duration-0 hover:duration-300 hover:ease-out px-4 py-2 focus:rounded-full focus:bg-blue-50 w-20 rounded-full underline font-bold underline-offset-4';
    default:
      return '';
  }
};

const BASE_LINK_CLASSES = 'cursor-pointer';

export const LinkSignUp = ({ ...props }, variant?) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpButton mode="modal" redirectUrl="/profile" afterSignUpUrl="/pricing">
        <Button variant={variant} {...props} aria-label="Sign up with Google">
          Sign Up
        </Button>
      </SignUpButton>
    </Suspense>
  );
};

export const LinkNav = ({ text, href, ariaLabel, ...props }) => {
  return (
    <Link
      className="flex items-center transition duration-0 hover:duration-300 hover:ease-out rounded text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:shadow-lg transform px-3 py-2"
      {...props}
      href={href}
      passHref
      aria-label={ariaLabel}
    >
      {text}
    </Link>
  );
};

export const LinkBody = ({ variant, text, href, ariaLabel, ...props }) => {
  const computedClasses = useMemo(() => {
    const modeClass = getLinkModeClasses(variant);
    return [BASE_LINK_CLASSES, modeClass].join(' ');
  }, [variant]);

  return (
    <Link className={computedClasses} {...props} href={href} passHref aria-label={ariaLabel}>
      {text}
    </Link>
  );
};

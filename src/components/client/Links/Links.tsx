'use client';
import { useMemo } from 'react';
import { SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';

const getLinkModeClasses = (variant) => {
  switch (variant) {
    case 'body':
      return 'w-36 py-3 cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
    case 'bodyOffWhite':
      return 'w-36 py-3 cursor-pointer bg-offwhite-500 border border-blue-700 rounded-full text-blue-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-offwhite-700 font-medium px-0 sm:px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
    case 'link':
      return 'underline font-medium text-blue-500 transition duration-0 py-2 focus:rounded-full focus:bg-blue-50 w-20 rounded-full';
    case 'nav':
      return 'font-medium text-blue-500 hover:rounded-full hover:bg-blue-50 transition duration-0 hover:duration-300 hover:ease-out px-4 py-2 focus:rounded-full focus:bg-blue-50 w-20 rounded-full';
    case 'login':
      return 'w-36 py-3 cursor-pointer py-3 rounded-full text-blue-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-50 hover:text-blue-500 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100 lg:ml-3';
    case 'warning':
      return 'text-white-500 hover:rounded-full hover:bg-blue-50 hover:text-blue-500 transition duration-0 hover:duration-300 hover:ease-out px-4 py-2 focus:rounded-full focus:bg-blue-50 w-20 rounded-full underline font-bold underline-offset-4';
    default:
      return '';
  }
};

const BASE_LINK_CLASSES = 'cursor-pointer';

export const LinkSignUp = ({ variant, text, ariaLabel, ...props }) => {
  const computedClasses = useMemo(() => {
    const modeClass = getLinkModeClasses(variant);
    return [BASE_LINK_CLASSES, modeClass].join(' ');
  }, [variant]);

  return (
    <SignUpButton mode="modal" redirectUrl="/profile" afterSignUpUrl="/pricing">
      <div className={computedClasses} {...props} aria-label={ariaLabel}>
        <button {...props}>{text}</button>
      </div>
    </SignUpButton>
  );
};

export const LinkNav = ({ variant, text, href, ariaLabel, ...props }) => {
  const computedClasses = useMemo(() => {
    const modeClass = getLinkModeClasses(variant);
    return [BASE_LINK_CLASSES, modeClass].join(' ');
  }, [variant]);

  return (
    <Link
      className={computedClasses}
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
    <Link
      className={computedClasses}
      {...props}
      href={href}
      passHref
      aria-label={ariaLabel}
    >
      {text}
    </Link>
  );
};

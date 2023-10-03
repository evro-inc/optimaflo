'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  MoonIcon,
  SunIcon,
  Bars3BottomRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import { signOut } from 'next-auth/react';
import router from 'next/router';
import Link from 'next/link';

const getModeClasses = (variant, billingInterval) => {
  let baseClasses = '';
  let activeClasses = 'relative w-1/2 shadow-sm';
  let inactiveClasses = 'relative w-1/2';

  switch (variant) {
    case 'primary':
      baseClasses =
        'cursor-pointer bg-blue-500  border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 text-sm lg:text-base font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-white transition px-6 w-7/12 sm:w-auto';
      break;
    case 'signup':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;

    case 'signupNav':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;

    case 'body':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;
    case 'bodyGray':
      baseClasses =
        'cursor-pointer py-3 bg-offwhite-700 rounded-full text-blue-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-offwhite-500 font-medium px-0 sm:px-6 w-36 active:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-100';
      break;

    case 'bodyLong':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full text-white-500 inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-56 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100 whitespace-nowrap';
      break;

    case 'bodyThin':
      baseClasses =
        'bg-offwhite-600 rounded-full text-blue-500 inline-flex justify-center items-center gap-x-3 text-center font-medium uppercase w-36';
      break;

    case 'circle':
      baseClasses =
        'hs-dropdown-toggle inline-flex flex-shrink-0 justify-center items-center gap-2 h-[2.375rem] w-[2.375rem] rounded-full font-medium bg-white text-gray-700 align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all text-xs';
      break;

    case 'toggle':
      baseClasses =
        'hs-collapse-toggle inline-flex justify-center items-center gap-2 rounded-md  font-medium text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all';
      break;
    case 'subscribe':
      baseClasses =
        'cursor-pointer py-3 rounded-full inline-flex justify-center items-center gap-x-3 text-center font-medium px-6 w-24 hover:bg-blue-500 hover:text-white-500 transition active:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-100 focus:bg-blue-500 focus:text-white-500 mx-2';
      break;
    case 'delete':
      baseClasses =
        'py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-red-600 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-red-500 dark:focus:ring-offset-gray-800';
      break;
    case 'create':
      baseClasses =
        'py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-blue-500 text-white-500 shadow-sm align-middle hover:bg-white-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm';
      break;
    case 'appPrimary':
      baseClasses =
        'inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-blue-500 text-white-500 shadow-sm align-middle hover:bg-white-500 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm whitespace-nowrap w-24 h-20';
      break;
    default:
      baseClasses = '';
  }

  return `${baseClasses} ${
    billingInterval === 'year' ? activeClasses : inactiveClasses
  }`;
};

const BASE_BUTTON_CLASSES = '';

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  variant = 'primary',
  text,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      {text}
    </button>
  );
};

/**
 * THEME BUTTON
 */
export const ButtonTheme = ({
  variant = 'primary',

  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
      {...props}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-6 h-6 text-yellow-500" />
      ) : (
        <MoonIcon className="w-6 h-6 text-blue-500" />
      )}
    </button>
  );
};

/**
 * TOGGLE BUTTON
 */

export const ButtonToggle = ({
  variant = 'toggle',
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      <Bars3BottomRightIcon className="hs-collapse-open:hidden w-14 h-14" />
      <XMarkIcon className="hs-collapse-open:block hidden w-14 h-14" />
    </button>
  );
};

/**
 * PROFILE BUTTON
 */
export const ButtonProfile = ({
  variant = 'circle',
  billingInterval,
  children, // Add this line
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);

    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button type="button" className={` ${computedClasses}`} {...props}>
      {children} {/* Render children here */}
    </button>
  );
};

/**
 * Sign In Button
 */
export const ButtonSignIn = ({
  variant = 'signup',

  text,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);

    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <Link
      href="/api/auth/signin"
      aria-label="Sign Up with Google"
      className={`${BASE_BUTTON_CLASSES} ${computedClasses} w-36 mx-5 lg:mx-0`}
    >
      <button {...props}>{text}</button>
    </Link>
  );
};

/**
 * Sign Out Button
 */
export const ButtonSignOut = ({
  variant = 'primary',
  text,
  billingInterval,
  ...props
}) => {
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);

    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
      onClick={handleSignOut} // And this line
      {...props}
    >
      {text}
    </button>
  );
};

/* Button Link */

export const ButtonLink = ({
  variant = 'primary',
  href,
  text,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <Link href={href}>
      <button
        className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
        {...props}
      >
        {text}
      </button>
    </Link>
  );
};

export const ButtonNull = ({
  variant = 'primary',
  text,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button className={`${computedClasses}`} {...props}>
      {text}
    </button>
  );
};

export const ButtonSubscribe = ({
  variant = 'primary',
  text,
  isSelected, // New prop
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  const selectedClasses = isSelected ? 'bg-blue-500 text-white-500' : '';

  return (
    <button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses} ${selectedClasses}`}
      {...props}
    >
      {text}
    </button>
  );
};

export const ButtonDelete = ({
  variant = 'primary',
  text,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      <svg
        className="w-3 h-3"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
        <path
          fillRule="evenodd"
          d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
        />
      </svg>
      {text}
    </button>
  );
};

export const ButtonWithIcon = ({
  variant = 'primary',
  text,
  icon,
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  return (
    <button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      {icon && <span className="mr-2">{icon}</span>}{' '}
      {/* Conditionally render SVG */}
      {text}
    </button>
  );
};

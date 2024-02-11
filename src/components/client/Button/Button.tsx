'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  MoonIcon,
  SunIcon,
  Bars3BottomRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { SignInButton } from '@clerk/nextjs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog';
import { setLoading } from '@/src/lib/redux/globalSlice';
import { useDispatch } from 'react-redux';
import { postData } from '@/src/lib/helpers';

const getModeClasses = (variant, billingInterval?) => {
  let baseClasses = '';
  let activeClasses = 'relative shadow-sm';
  let inactiveClasses = 'relative';

  switch (variant) {
    case 'primary':
      baseClasses =
        'cursor-pointer bg-blue-500 border border-blue-700 rounded-full inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 text-sm lg:text-base font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-white transition px-6 w-7/12 sm:w-auto';
      break;
    case 'signup':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;

    case 'signupNav':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-full lg:w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;

    case 'body':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-36 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100';
      break;
    case 'bodyGray':
      baseClasses =
        'cursor-pointer py-3 bg-offwhite-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-offwhite-500 font-medium px-0 sm:px-6 w-36 active:bg-gray-700 focus:outline-none focus:ring focus:ring-gray-100';
      break;

    case 'bodyLong':
      baseClasses =
        'cursor-pointer py-3 bg-blue-500 border border-blue-700 rounded-full  inline-flex justify-center items-center gap-x-3 text-center hover:bg-blue-300 font-medium px-6 w-56 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-100 whitespace-nowrap';
      break;

    case 'bodyThin':
      baseClasses =
        'bg-offwhite-600 rounded-full  inline-flex justify-center items-center gap-x-3 text-center font-medium uppercase w-36';
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
        'cursor-pointer py-3 rounded-full inline-flex justify-center items-center gap-x-3 text-center font-medium px-6 w-24 hover:bg-blue-500 hover: transition active:bg-blue-500 focus:outline-none focus:ring focus:ring-blue-100 focus:bg-blue-500 focus: mx-2';
      break;
    case 'delete':
      baseClasses =
        'py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-red-600 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-red-500 dark:focus:ring-offset-gray-800';
      break;
    case 'create':
      baseClasses =
        'py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border font-medium  shadow-sm align-middle  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm';
      break;

    case 'appPrimary':
      baseClasses =
        'inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-blue-500  shadow-sm align-middle hover:bg-white-500 hover: focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm whitespace-nowrap w-24 h-20';
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
export const ButtonPrim = ({
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
    <Button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      {text}
    </Button>
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
    <Button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
      {...props}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon className="w-6 h-6 text-yellow-500" />
      ) : (
        <MoonIcon className="w-6 h-6 " />
      )}
    </Button>
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
    <Button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      <Bars3BottomRightIcon className="hs-collapse-open:hidden w-14 h-14" />
      <XMarkIcon className="hs-collapse-open:block hidden w-14 h-14" />
    </Button>
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
      <Button
        className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
        {...props}
      >
        {text}
      </Button>
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
    <Button className={`${computedClasses}`} {...props}>
      {text}
    </Button>
  );
};

export const ButtonSubscribe = ({
  variant = 'primary',
  text,
  isselected, // New prop
  billingInterval,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant, billingInterval);
    return [modeClass].join(' ');
  }, [variant, billingInterval]);

  const selectedClasses = isselected ? 'bg-blue-500 ' : '';

  return (
    <Button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses} ${selectedClasses}`}
      {...props}
    >
      {text}
    </Button>
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
    <Button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      {icon && <span className="mr-2">{icon}</span>}{' '}
      {/* Conditionally render SVG */}
      {text}
    </Button>
  );
};

export const Icon = ({ variant = 'primary', icon, ...props }) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant);
    return [modeClass].join(' ');
  }, [variant]);

  return (
    <Button className={`${BASE_BUTTON_CLASSES} ${computedClasses}`} {...props}>
      {icon && <span>{icon}</span>}{' '}
    </Button>
  );
};

export const ButtonSignIn = ({ ...props }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInButton
        mode="modal"
        redirectUrl="/profile"
        afterSignUpUrl="/pricing"
      >
        <Button {...props} aria-label="Log in with Google Sign In">
          Log In
        </Button>
      </SignInButton>
    </Suspense>
  );
};

export const ButtonCustomerPortal = ({
  variant = 'primary',
  text,
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant);
    return [modeClass].join(' ');
  }, [variant]);
  const dispatch = useDispatch();

  const redirectToCustomerPortal = async () => {
    dispatch(setLoading(true));
    try {
      const { url } = await postData({
        url: '/api/create-portal-link',
      });
      window.location.assign(url);
    } catch (error: any) {
      if (error) throw new Error(error);
    }
    dispatch(setLoading(false));
  };

  return (
    <Button
      className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
      {...props}
      onClick={redirectToCustomerPortal}
    >
      {text}
    </Button>
  );
};

/* SHADUI */

export const ButtonDelete = ({ onDelete, disabled }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={disabled} className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">
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
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const ButtonSubmitAlert = ({
  text,
  form,
}: {
  text: string;
  form: string;
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="submit">{text}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create New GA4 Account(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Once you click continue, you have see tabs open in your browser.
            These tabs will be for you to accept the Google Analytics terms of
            service for each account you want to create. Once you have accepted,
            you will need to come back here and refresh the table to see you're
            updated account(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="submit" form={form}>
              Continue
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

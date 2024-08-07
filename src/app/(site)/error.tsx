'use client';

import Link from 'next/link';

export default function Error() {
  import Link from 'next/link';

  export default function Error() {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800 px-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="text-4xl mt-2 mb-4">😞</p>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Oops, something went wrong!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2 mb-6 mx-auto max-w-xs">
          The page you are looking for does not exist or an other error occurred.
        </p>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
          href="/"
        >
          Go back
        </Link>
      </main>
    );
  }

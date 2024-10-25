import { LinkSignUp } from '@/src/components/client/Links/Links';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';
import React from 'react';

export default function Component() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="flex items-center justify-center">
          <div className="bg-primary rounded-full p-4 animate-bounce shadow-lg">
            <CompassIcon className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Oops, you seem to have taken a wrong turn!
        </h1>
        <p className="mt-4 text-muted-foreground">No need to worry, get back on the right path.</p>
        <div className="mt-6 flex space-x-4 justify-between">
          <LinkSignUp variant="default" className="flex-1" />

          <Button asChild className="flex-1">
            <Link href="/pricing" aria-label="Subscribe to OptimaFlo">
              Subscribe
            </Link>
          </Button>

          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex-1 justify-center"
            prefetch={false}
          >
            <HomeIcon className=" h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompassIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

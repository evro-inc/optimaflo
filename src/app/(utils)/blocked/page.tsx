import { Button } from '@/src/components/ui/button';
import { LockClosedIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import React from 'react';

export default function Blocked() {
  return (
    <div>
      <main>
        <section className="w-full h-screen flex flex-col items-center justify-center gap-8 px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900">
            <LockClosedIcon className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Restricted Content
            </h2>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              The content you are trying to access is exclusive to our subscribers. Please subscribe
              to gain access.
            </p>
          </div>
          <Button asChild>
            <Link href="/pricing" aria-label="Subscribe to OptimaFlo">
              Subscribe
            </Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

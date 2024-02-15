/**
 * v0 by Vercel.
 * @see https://v0.dev/t/MIgoJ5XKP72
 */
'use client';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/src/components/ui/navigation-menu';

import React from 'react';
import { cn } from '@/src/utils/utils';
import { MobileSidebar } from './mobile-sidebar';

export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 w-full flex items-center justify-between px-4 py-2 bg-white shadow-md z-10">
      <div className="flex items-center">
        <Link
          href="/"
          className="hidden items-center justify-between gap-2 md:flex"
        >
          <MountainIcon className="h-6 w-6" />
          <h1 className="text-lg font-semibold pl-3">OptimaFlo</h1>
        </Link>
        <div className={cn('block md:!hidden')}>
          <MobileSidebar />
        </div>
      </div>

      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem></NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink>
              <UserButton />
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function MountainIcon(props) {
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
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

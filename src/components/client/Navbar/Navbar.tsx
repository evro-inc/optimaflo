'use client';
import Link from 'next/link';

import React from 'react';
import { ButtonSignIn } from '../../client/Button/Button';
import { LinkSignUp, LinkNav } from '../Links/Links';
import { SignedIn, SignedOut, UserButton, } from '@clerk/nextjs';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../../ui/sheet';
import { Button } from '../../ui/button';

const navigation = [
  { name: 'About', href: '/about' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  return (
    <header className="flex flex-wrap lg:justify-start lg:flex-nowrap z-40 w-full text-sm py-3 lg:py-0">
      {/* Left side: Logo */}
      <div className="flex items-center">
        <Link className="flex-none text-xl font-semibold ml-5" href="/" aria-label="Brand">
          OptimaFlo
        </Link>
      </div>

      <Sheet>
        <div className="flex ml-auto items-center">
          <SignedIn>
            {/* Mount the UserButton component */}
            <div className="px-5 lg:hidden">
              <UserButton />
            </div>
          </SignedIn>
          <SheetTrigger asChild>
            <Button variant="ghost" className="lg:hidden">
              <HamburgerMenuIcon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        </div>

        <SheetContent>
          <nav className="md:hidden flex flex-col ml-auto gap-4 sm:gap-6">
            {navigation.map((item) => (
              <div key={item.name} className="font-medium p-0 sm:p-[10px]">
                <SheetClose asChild>
                  <LinkNav
                    href={item.href}
                    text={item.name}
                    ariaLabel={`Navigate to ${item.name}`}
                  />
                </SheetClose>
              </div>
            ))}
            <SignedIn>
              {/* Mount the UserButton component */}
              <div className="font-medium p-0 sm:p-[10px]">
                <SheetClose asChild>
                  <LinkNav href="/profile" text="Profile" ariaLabel="profile" />
                </SheetClose>
              </div>
            </SignedIn>

            <SignedOut>
              <SheetClose>
                <ButtonSignIn className="w-full" />
              </SheetClose>
              <SheetClose>
                <LinkSignUp variant="default" className="w-full" />
              </SheetClose>
            </SignedOut>
          </nav>
        </SheetContent>
      </Sheet>

      <nav className="hidden lg:flex ml-auto gap-4 sm:gap-6">
        {navigation.map((item) => (
          <div key={item.name} className="flex lg:flex-row items-center font-medium">
            <Button variant="ghost" asChild>
              <Link aria-label={`Navigate to ${item.name}`} href={item.href}>
                {item.name}
              </Link>
            </Button>
          </div>
        ))}

        <SignedIn>
          {/* Mount the UserButton component */}
          <div className="hidden lg:flex items-center font-medium p-0 sm:p-[10px]  w-full lg:w-auto">
            <Link href="/profile" className="pr-10" aria-label="profile page button">
              Profile
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
        <SignedOut>
          <div className="flex lg:flex-row items-center font-medium  p-0 sm:p-[10px]  w-full lg:w-auto">
            <ButtonSignIn className="mr-4" /> {/* Adds margin to the right */}
            <LinkSignUp variant="default" />
          </div>
        </SignedOut>
      </nav>
    </header>
  );
}

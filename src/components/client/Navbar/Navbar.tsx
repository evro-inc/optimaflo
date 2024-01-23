'use client';
import Link from 'next/link';

import { useRef } from 'react';
import React from 'react';
import Logo from '../../icons/Logo';
import { ButtonSignIn } from '../../client/Button/Button';
import { LinkSignUp, LinkNav } from '../Links/Links';
import { UserButton, useSession } from '@clerk/nextjs';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Sheet, SheetContent, SheetTrigger } from '../../ui/sheet';
import { Button } from '../../ui/button';

const navigation = [
  { name: 'About', href: '/about' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { session } = useSession();

  return (
    <header className="flex flex-wrap lg:justify-start lg:flex-nowrap z-40 w-full text-sm py-3 lg:py-0">
      {/* Left side: Logo */}
      <div className="flex items-center">
        <Link
          className="flex-none text-xl font-semibold ml-5"
          href="/"
          aria-label="Brand"
        >
          <Logo />
          <span className="sr-only">OptimaFlo</span>
        </Link>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="toggle" className="lg:hidden ml-auto">
            <HamburgerMenuIcon className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <nav className="md:hidden flex flex-col ml-auto gap-4 sm:gap-6">
            {navigation.map((item, index) => (
              <div className="font-medium p-0 sm:p-[10px]">
                <LinkNav
                  href={item.href}
                  text={item.name}
                  ariaLabel={`Navigate to ${item.name}`}
                />
              </div>
            ))}

            {/* Container for vertical display */}
            {session?.user ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <>
                <ButtonSignIn />
                <LinkSignUp />
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <nav className="hidden lg:flex ml-auto gap-4 sm:gap-6">
        {navigation.map((item, index) => (
          <div className="flex lg:flex-row items-center font-medium  p-0 sm:p-[10px]  w-full lg:w-auto">
            <LinkNav
              href={item.href}
              text={item.name}
              ariaLabel={`Navigate to ${item.name}`}
            />
          </div>
        ))}

        {session?.user ? (
          <div className="hidden lg:flex items-center font-medium p-0 sm:p-[10px]  w-full lg:w-auto">
            <UserButton afterSignOutUrl="/" />
          </div>
        ) : (
          <div className="flex lg:flex-row items-center font-medium  p-0 sm:p-[10px]  w-full lg:w-auto">
            <ButtonSignIn className="mr-4" /> {/* Adds margin to the right */}
            <LinkSignUp />
          </div>
        )}
      </nav>
    </header>
  );
}

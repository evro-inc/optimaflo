'use client';
import Link from 'next/link';

import { useRef } from 'react';
import React from 'react';
import Logo from '../../icons/Logo';
import { ButtonSignIn, ButtonToggle } from '../../client/Button/Button';
import { LinkSignUp, LinkNav } from '../Links/Links';
import { UserButton, useSession } from '@clerk/nextjs';

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
    <div className="relative">
      <header
        ref={menuRef}
        className="flex flex-wrap lg:justify-start lg:flex-nowrap z-40 w-full bg-offwhite-300 border-b border-gray-200 text-sm py-3 lg:py-0"
      >
        <nav
          className="relative max-w-7xl w-full mx-auto px-4 lg:flex lg:items-center lg:justify-between lg:px-6"
          aria-label="Global"
        >
          <div className="flex justify-between items-center">
            {/* Left side: Logo */}
            <Link
              className="flex-none text-xl font-semibold "
              href="/"
              aria-label="Brand"
            >
              <Logo />
            </Link>

            {/* Right side: Buttons */}
            <div className="flex items-center">
              {/* ButtonToggle and ButtonTheme for small screens */}
              <div className="lg:hidden flex items-center space-x-4">
                {session?.user && (
                  <div className="ml-3 relative">
                    <div className="block lg:hidden">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </div>
                )}
                <ButtonToggle
                  variant="toggle"
                  billingInterval={''}
                  text=""
                  data-hs-collapse="#navbar-collapse-with-animation"
                  aria-controls="navbar-collapse-with-animation"
                  aria-label="Toggle navigation"
                />
              </div>
            </div>
          </div>

          <div
            id="navbar-collapse-with-animation"
            className="hs-collapse hidden overflow-hidden transition-all duration-300 basis-full grow lg:block"
          >
            <div className="flex flex-col gap-y-4 gap-x-0 mt-5 divide-y divide-gray-200 lg:divide-y-0 lg:flex-row lg:items-center lg:justify-end lg:gap-y-0 lg:gap-x-7 lg:mt-0 lg:pl-7">
              <ul className="flex flex-col gap-y-4 divide-y divide-gray-200 lg:divide-y-0 lg:flex-row lg:gap-x-7">
                {navigation.map((item, index) => (
                  <li
                    key={item.name}
                    className={`pt-4 lg:pt-0 ${
                      index === 0
                        ? 'border-t border-gray-200 lg:border-t-0'
                        : ''
                    }`}
                  >
                    <LinkNav
                      href={item.href}
                      variant="nav"
                      text={item.name}
                      ariaLabel={`Navigate to ${item.name}`}
                    />
                  </li>
                ))}
              </ul>

              <div className="lg:py-2">
                <div className="flex lg:flex-row items-center font-medium text-gray-500 hover:text-blue-600 lg:border-l p-0 sm:p-[10px] lg:border-gray-300 w-full lg:w-auto">
                  {session?.user && (
                    <div className="hidden lg:flex items-center font-medium text-gray-500 hover:text-blue-600 p-0 sm:p-[10px] lg:border-gray-300 w-full lg:w-auto">
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  )}
                  {!session?.user && (
                    // Sign in Button
                    <div className="flex lg:flex-row items-center font-medium text-gray-500 hover:text-blue-600 p-0 sm:p-[10px] lg:border-gray-300 w-full lg:w-auto">
                      <ButtonSignIn
                        variant="signupNav"
                        billingInterval={''}
                        aria-label="Log in with Google Sign In"
                        text="Log In"
                      />
                      <LinkSignUp
                        variant="login"
                        ariaLabel="Get Started with Google"
                        text="Get Started"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </div>
  );
}

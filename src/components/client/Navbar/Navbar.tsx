'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Logo from '../../icons/Logo';
import {
  Button,
  ButtonProfile,
  ButtonToggle,
  ButtonSignIn,
} from '../../client/Button/Button';
import { LinkBody } from '../Links/Links';

const navigation = [
  { name: 'About', href: '/about' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const menuRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const { data: session } = useSession();

  // This function checks if the clicked area is outside the menu
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setShowMenu(false);
    }
  };

  useEffect(() => {
    // When the component is mounted, it adds the "click" event listener
    document.addEventListener('click', handleClickOutside);
    return () => {
      // When the component is unmounted, it removes the "click" event listener
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

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
                      <ButtonProfile
                        variant="circle"
                        onClick={() => setShowMenu(!showMenu)}
                        id="user-menu"
                        aria-label="User menu"
                        aria-haspopup="true"
                        billingInterval={''}
                      >
                        <Image
                          className="object-cover rounded-full"
                          layout="fill"
                          src={session?.user.image}
                          alt="Picture of the author"
                        />
                      </ButtonProfile>
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
                {/* <ButtonTheme
                  className={`${THEME_BUTTON_CLASSES}`}
                  variant="primary"
                  size="small"
                  text=""
                  billingInterval={''}
                  type="button"
                  aria-label="Toggle Dark Mode"
                /> */}
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
                    <LinkBody
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
                    <div className="ml-3 relative">
                      <div className="pr-5 hidden lg:block">
                        <ButtonProfile
                          variant="circle"
                          onClick={() => setShowMenu(!showMenu)}
                          id="user-menu"
                          aria-label="User menu"
                          aria-haspopup="true"
                          billingInterval={''}
                        >
                          <Image
                            className="object-cover rounded-full"
                            layout="fill"
                            src={session?.user.image}
                            alt="Picture of the author"
                          />
                        </ButtonProfile>
                      </div>
                    </div>
                  )}
                  {!session?.user && (
                    // Sign in Button
                    <div className="flex lg:flex-row items-center font-medium text-gray-500 hover:text-blue-600 p-0 sm:p-[10px] lg:border-gray-300 w-full lg:w-auto">
                      <ButtonSignIn
                        variant="signupNav"
                        billingInterval={''}
                        aria-label="Get Started with Google Sign In"
                        text="Get Started"
                      />
                      <LinkBody
                        variant="login"
                        href="/api/auth/signin"
                        ariaLabel="Log in with Google"
                        text="Log In"
                      />
                    </div>
                  )}

                  <div className="space-x-8 hidden lg:block">
                    {/* <ButtonTheme
                      className={`${THEME_BUTTON_CLASSES}`}
                      variant="primary"
                      size="small"
                      text=""
                      billingInterval={''}
                      type="button"
                      aria-label="Toggle Dark Mode"
                    /> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
      {showMenu && (
        <div
          className="origin-top-right absolute right-40 mt-2 w-48 rounded-md shadow-lg bg-white-500 ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu"
        >
          <div className="py-1 rounded-md bg-white shadow-xs" role="none">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm hover:bg-blue-500 hover:text-white-500 w-full text-left"
              role="menuitem"
              onClick={() => {
                setShowMenu(false);
              }}
            >
              Your Profile
            </Link>

            <Button
              onClick={handleSignOut}
              className="block px-4 py-2 text-sm hover:bg-blue-500 hover:text-white-500 w-full text-left"
              role="menuitem"
              billingInterval={''}
              text="Sign out"
            />
          </div>
        </div>
      )}
    </div>
  );
}

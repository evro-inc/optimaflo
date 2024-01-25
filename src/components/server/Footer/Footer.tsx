import Link from 'next/link';
import { Images } from '../../client/Images/Images';
import { LinkBody } from '../../client/Links/Links';
import { Button } from '../../ui/button';

export default function Footer() {
  const navigation = [
    { name: 'About', href: '/about' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Contact', href: '/contact' },
  ];
  return (
    <footer className="w-full max-w-[85rem] py-20 mx-auto">
      <div className="flex flex-col space-y-6 sm:space-y-0 sm:flex-row justify-around items-center border-b border-gray-300 pb-5">
        {/* First Column: Logo */}
        <div>
          <Link
            className="text-xl font-semibold text-black "
            href="#"
            aria-label="Brand"
          >
            OptimaFlo
          </Link>
        </div>

        {/* Second Column: Links */}
        <div>
          <nav className="hidden sm:flex ml-auto gap-4 sm:gap-6">
            {navigation.map((item, index) => (
              <div className="flex sm:flex-row items-center font-medium">
                <Button variant="ghost" asChild>
                  <Link
                    aria-label={`Navigate to ${item.name}`}
                    href={item.href}
                  >
                    {item.name}
                  </Link>
                </Button>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="grid md:grid-cols-2 sm:grid-cols-1 gap-4 text-center pt-5">
        <p className="md:col-span-1 sm:col-span-1">
          <span>Copyright © 2023 OptimaFlo.</span>
          <span> All Rights Reserved.</span>
        </p>

        {/* Third Column: Social Media Buttons */}
        <div className="md:col-span-1 sm:col-span-1">
          {/* Your social media buttons go here */}

          <div className="inline-block px-4">
            <LinkBody
              variant="link"
              text="Terms of Service"
              href="/tos"
              ariaLabel="Terms of Service"
            />
          </div>

          <LinkBody
            variant="link"
            text="Privacy Policy"
            href="/privacy"
            ariaLabel="Privacy Policy"
          />
        </div>
      </div>
    </footer>
  );
}

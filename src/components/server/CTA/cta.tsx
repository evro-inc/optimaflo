import React from 'react';
import { getHomePage } from '@/sanity/sanity-utils';
import { LinkSignUp } from '../../client/Links/Links';
import { Button } from '../../ui/button';
import Link from 'next/link';

export default async function CTA() {
  const homePage = await getHomePage();

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blueBackground via-blueLightBackground bg-blueBackground">
      <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-24 text-white-500">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            {homePage[0].ctaTitle}
          </h2>

          <p className="mt-3">{homePage[0].ctaDescription}</p>

          <div className="pt-16 flex flex-row justify-center items-center pb-10 space-x-4">
            <LinkSignUp variant="secondary" />

            <Button variant="secondary" asChild>
              <Link
                href="/features"
                aria-label="Learn more about features button"
              >
                Learn more
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

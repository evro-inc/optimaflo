import React from 'react';
import { ButtonSignIn } from '../../client/Button/Button';
import { getHomePage } from '@/sanity/sanity-utils';
import { LinkBody } from '../../client/Links/Links';

export default async function CTA() {
  const homePage = await getHomePage();

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-blue-300 to-blue-500">
      <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-24 text-white-500">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
            {homePage[0].ctaTitle}
          </h2>

          <p className="mt-3">{homePage[0].ctaDescription}</p>

          <div className="pt-16 flex flex-col sm:flex-row justify-center items-center pb-10 space-y-4 sm:space-y-0 sm:space-x-4">
            <ButtonSignIn
              variant="bodyGray"
              size="large"
              text="Get started"
              type="button"
              aria-label="Get Started Button"
              href="#"
            />
            
            <LinkBody
              variant="bodyOffWhite"
              href="/features"
              text="Learn more"
              ariaLabel="Learn More Button"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

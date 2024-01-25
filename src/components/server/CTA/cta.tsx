import React from 'react';
import { getHomePage } from '@/sanity/sanity-utils';
import { LinkSignUp } from '../../client/Links/Links';

export default async function CTA() {
  const homePage = await getHomePage();

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blueBackground via-blueLightBackground bg-blueBackground text-secondary">
      <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center mx-auto">
          <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
            {homePage[0].ctaTitle}
          </h2>
        </div>

        <div className="max-w-2xl text-center mx-auto">
          <p className="text-lg">{homePage[0].ctaTitle}</p>
        </div>

        <div className="flex flex-row justify-center items-center text-center pt-5">
          <LinkSignUp className="w-1/4" variant="secondary" />
        </div>
      </div>
    </section>
  );
}

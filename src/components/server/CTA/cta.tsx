import React from 'react';
import { LinkSignUp } from '../../client/Links/Links';
import { client } from '@/src/lib/sanity/sanity-utils';

type HomePage = {
  id: string;
  title: string;
  subtitle: string;
  spanTitle: string;
  headerImage: string;
  oneLiner: string;
  oneLinerDescription: string;
  features: {
    featureTitle: string;
    featureDescription: string;
    featureImage: string;
  }[];
  howItWorks: {
    title: string;
    description: string;
    image: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  ctaTitle: string;
  ctaDescription: string;
};

export default async function CTA() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
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
    } else {
      return (
        <div>
          <h1>Something went wrong</h1>
        </div>
      );
    }
  } catch (error) {
    return (
      <div>
        <h1>Something went wrong</h1>
      </div>
    );
  }
}

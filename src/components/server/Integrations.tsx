import React from 'react';
import { client } from '@/src/lib/sanity/sanity-utils';
import { Button } from '../../ui/button';
import Link from 'next/link';

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

export default async function Integrations() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section>
          {homePage.map((page) => {
            return (
              <>
                <div
                  className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-300 via-gray-100 to-gray-300"
                  key={page.id}
                >
                  <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                    <div className="text-center mx-auto">
                      <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
                        {page.oneLiner}{' '}
                      </h2>
                    </div>

                    <div className="max-w-2xl text-center mx-auto">
                      <p className="text-lg">{page.oneLinerDescription}</p>
                    </div>

                    <div className="flex flex-row justify-center items-center text-center pt-5">
                      <Button asChild>
                        <Link
                          href="/features"
                          aria-label="Explore Integrations button"
                          className="w-1/4"
                        >
                          Explore Integrations
                        </Link>
                      </Button>
                    </div>

                    {/* <div className="flex justify-center items-center space-x-16 pt-10">
                    <Logo
                      src="/gtm.svg"
                      alt="Google Tag Manager Logo"
                      width={50}
                      height={50}
                    />

                    <Logo
                      src="/ga.svg"
                      alt="Google Analytics Logo"
                      width={50}
                      height={50}
                    />

                    <Logo
                      src="/openai.svg"
                      alt="OpenAI Logo"
                      width={50}
                      height={50}
                    />

                    <Logo
                      src="/cypress.svg"
                      alt="Cypress Logo"
                      width={100}
                      height={100}
                    /> 
                  </div> */}
                  </div>
                </div>
              </>
            );
          })}
        </section>
      );
    } else {
      return (
        <div>
          <p>There was an error</p>
        </div>
      );
    }
  } catch (error) {
    return (
      <div>
        <p>There was an error</p>
      </div>
    );
  }
}

import React from 'react';
import { client } from '@/src/lib/sanity/sanity-utils';

import Image from 'next/image';

import { LinkSignUp } from '../../client/Links/Links';
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

export default async function Hero() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section>
          {homePage.map((page) => {
            return (
              <>
                {/* Hero */}
                <div key={page.id}>
                  <div className="container mx-auto px-2 py-20 w-full">
                    {/* Title */}
                    <header className="container mx-auto px-2 py-6 sm:py-20 w-full text-center">
                      <h1 className="font-bold text-3xl md:text-5xl lg:text-6xl">
                        {page.title} <span>{page.spanTitle}</span>
                      </h1>
                      <p className="mt-5 max-w-2xl mx-auto pb-8 px-5 text-md md:text-2xl lg:text-3xl">
                        {page.subtitle}
                      </p>
                    </header>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center items-center pb-20 space-y-4 sm:space-y-0 sm:space-x-4">
                      <LinkSignUp variant="default" />

                      <Button asChild>
                        <Link href="/features" aria-label="Learn more about features button">
                          Learn more
                        </Link>
                      </Button>
                    </div>

                    <div className="max-w-[85rem] mx-auto flex justify-center items-center relative">
                      <div className="relative w-full" style={{ maxWidth: '1000px' }}>
                        <Image
                          layout="responsive"
                          width={1000}
                          height={1000}
                          src={'/tabletDashboard.svg'}
                          alt="Dashboard Image"
                        />

                        <div className="absolute left-1 sm:-left-1 md:-left-1 lg:-left-[1%] xl:-left-[5%] top-[20%] w-64">
                          <div className="flex flex-col bg-white-500 border shadow-sm rounded-xl p-3 sm:p-4 md:p-5 /[.7] ">
                            Scale your Google Tag Manager and Google Analytics 4 implementations
                            with ease.
                          </div>
                        </div>

                        <div className="absolute right-0 sm:-right-2 md:-right-4 lg:-right-6 xl:-right-8 top-[40%] w-80">
                          <div className="flex-col bg-white-500 border shadow-sm rounded-xl p-3 sm:p-4 md:p-5 /[.7] hidden md:flex">
                            Maintain and manage users, data flows, and more.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* End Hero */}
              </>
            );
          }, [])}
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
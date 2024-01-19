import React from 'react';
import { getHomePage } from '@/sanity/sanity-utils';

import Image from 'next/image';
import { ButtonSignIn } from '@/src/components/client/Button/Button';

import { LinkBody } from '../../client/Links/Links';

export default async function Hero() {
  const homePage = await getHomePage();

  return (
    <section className="bg-offwhite-300 ">
      {homePage.map((page) => {
        return (
          <>
            {/* Hero */}
            <div key={page.id}>
              <div className="container mx-auto px-2 py-20 w-full">
                {/* Title */}
                <header className="container mx-auto px-2 py-6 sm:py-20 w-full text-center">
                  <h1 className="font-bold text-gray-800 text-3xl md:text-5xl lg:text-6xl ">
                    {page.title}{' '}
                    <span className="text-blue-300">{page.spanTitle}</span>
                  </h1>
                  <p className="mt-5 max-w-xl mx-auto pb-8 px-5 text-md md:text-2xl lg:text-3xl text-gray-600 ">
                    {page.subtitle}
                  </p>
                </header>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row justify-center items-center pb-20 space-y-4 sm:space-y-0 sm:space-x-4">
                  <ButtonSignIn
                    variant="body"
                    size="large"
                    text="Get started"
                    type="button"
                    aria-label="Get Started Button"
                    href="#"
                  />
                  <LinkBody
                    variant="body"
                    href="/features"
                    text="Learn more"
                    ariaLabel="Learn More Button"
                  />
                </div>

                <div className="max-w-[85rem] mx-auto flex justify-center items-center relative">
                  <div
                    className="relative w-full"
                    style={{ maxWidth: '1000px' }}
                  >
                    <Image
                      layout="responsive"
                      width={1000}
                      height={1000}
                      src={'/tabletDashboard.svg'}
                      alt="Dashboard Image"
                    />

                    <div className="absolute left-1 sm:-left-1 md:-left-1 lg:-left-[1%] xl:-left-[5%] top-[20%] w-64">
                      <div className="flex flex-col bg-white-500 border shadow-sm rounded-xl p-3 sm:p-4 md:p-5 /[.7] ">
                        Some quick example text to build on the card title and
                        make up the bulk of the cards content.
                      </div>
                    </div>

                    <div className="absolute right-0 sm:-right-2 md:-right-4 lg:-right-6 xl:-right-8 top-[40%] w-80">
                      <div className="flex-col bg-white-500 border shadow-sm rounded-xl p-3 sm:p-4 md:p-5 /[.7] hidden md:flex">
                        Some quick example text to build on the card title and
                        make up the bulk of the cards content.
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
}

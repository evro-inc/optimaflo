import React from 'react';
import { getHomePage } from '@/sanity/sanity-utils';
import { ButtonLink, ButtonNull } from '../../client/Button/Button';
import { Logo } from '../../client/Images/Images';

export default async function Integrations() {
  const homePage = await getHomePage();

  return (
    <section>
      {homePage.map((page) => {
        return (
          <>
            <div
              className="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-300 via-gray-100 to-gray-300"
              key={page.id}
            >
              <div className="text-blue-500 ">
                <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
                  <div className="text-center">
                    <ButtonNull
                      billingInterval={''}
                      variant="bodyThin"
                      text="Integrations"
                      type="button"
                      aria-label="Explore Integrations"
                    />
                  </div>

                  <div className="max-w-3xl text-center mx-auto">
                    <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
                      {page.oneLiner}{' '}
                    </h2>
                  </div>

                  <div className="max-w-3xl text-center mx-auto">
                    <p className="text-lg">{page.oneLinerDescription}</p>
                  </div>

                  <div className="text-center">
                    <ButtonLink
                      billingInterval={''}
                      href="/features"
                      variant="bodyLong"
                      text="Explore Integrations"
                      type="button"
                      aria-label="Explore Integrations Button"
                    />
                  </div>
                  <div className="flex justify-center items-center space-x-28 pt-10">
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
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })}
    </section>
  );
}

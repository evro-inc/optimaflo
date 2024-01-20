import React from 'react';
import { getHomePage } from '@/sanity/sanity-utils';
import { ButtonNull } from '../../client/Button/Button';
import { LinkBody } from '../../client/Links/Links';

export default async function FAQ() {
  const homePage = await getHomePage();

  return (
    <section>
      {homePage.map((page) => {
        return (
          <>
            <div className="bg-white-500 " key={page.id}>
              <div className="text-blue-500 ">
                <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
                  <div className="text-center">
                    <ButtonNull
                      billingInterval={''}
                      variant="bodyThin"
                      text="Questions"
                      type="button"
                      aria-label="FAQ Section"
                    />
                  </div>

                  <div className="max-w-3xl text-center mx-auto">
                    <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
                      Frequently Asked Questions
                    </h2>
                  </div>

                  <div className="max-w-3xl text-center mx-auto">
                    <p className="text-lg">{page.oneLinerDescription}</p>
                  </div>
                  <div className="md:col-span-3 max-w-2xl mx-auto">
                    <div className="hs-accordion-group divide-y divide-gray-200 ">
                      {homePage[0].faq.map((faq, index) => {
                        return (
                          <div
                            key={index}
                            className="hs-accordion pb-3"
                            id="hs-basic-with-title-and-arrow-stretched-heading-one"
                          >
                            <button
                              className="hs-accordion-toggle group pb-3 inline-flex items-center justify-between gap-x-3 w-full md:text-lg font-semibold text-left transition "
                              aria-controls="hs-basic-with-title-and-arrow-stretched-collapse-one"
                            >
                              {faq.question}
                              <svg
                                className="hs-accordion-active:hs-accordion-active:hidden block w-3 h-3 "
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <svg
                                className="hs-accordion-active:block hidden w-3 h-3 "
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M2 11L8.16086 5.31305C8.35239 5.13625 8.64761 5.13625 8.83914 5.31305L15 11"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                            <div
                              id="hs-basic-with-title-and-arrow-stretched-collapse-one"
                              className={`hs-accordion-content w-full overflow-hidden transition-[height] duration-300 ${
                                index === 0 ? '' : 'hidden'
                              }`}
                              aria-labelledby="hs-basic-with-title-and-arrow-stretched-heading-one"
                            >
                              <p>{faq.answer}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center items-center">
                    <div className="text-center">
                      <div className="flex flex-wrap items-center bg-gray-200 px-5 py-2 rounded-full">
                        <p className="flex-grow mb-0 md:mr-2">
                          {' '}
                          Unable to find the answer you were looking for?
                        </p>
                        <div className="w-full md:w-auto md:ml-auto md:mt-0">
                          <LinkBody
                            variant="link"
                            text="Contact Support"
                            href="/contact"
                            ariaLabel="Contact Support"
                          />
                        </div>
                      </div>
                    </div>
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

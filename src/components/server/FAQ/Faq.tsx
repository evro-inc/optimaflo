import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import Link from 'next/link';
import { client } from '@/src/lib/sanity/sanity-utils';

type FAQProps = {
  id: string;
  faq: {
    question: string;
    answer: string;
  }[];
  ctaTitle: string;
  ctaDescription: string;
};

export default async function FAQ() {
  try {
    const homePage = await client.fetch<FAQProps[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section>
          {homePage.map((page) => {
            return (
              <>
                <div className="bg-white-500 " key={page.id}>
                  <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8">
                    <div className="max-w-3xl text-center mx-auto">
                      <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl">
                        Frequently Asked Questions
                      </h2>
                    </div>

                    <div className="max-w-3xl text-center mx-auto">
                      <p className="text-lg">{page.oneLinerDescription}</p>
                    </div>
                    <div className="md:col-span-3 max-w-2xl mx-auto">
                      <Accordion type="single" collapsible className="w-full">
                        {homePage[0].faq.map((faq, index) => {
                          const displayIndex = index + 1;

                          return (
                            <AccordionItem value={displayIndex} key={index}>
                              <AccordionTrigger>{faq.question}</AccordionTrigger>
                              <AccordionContent>{faq.answer}</AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>

                    <div className="flex justify-center items-center">
                      <div className="text-center">
                        <div className="flex flex-wrap items-center bg-gray-200 px-5 py-2 rounded-full">
                          <p className="flex-grow mb-0 md:mr-2">
                            {' '}
                            Unable to find the answer you were looking for?
                          </p>
                          <div className="w-full md:w-auto md:ml-auto md:mt-0">
                            <Link href="/contact" aria-label="Contact Support">
                              Contact Support
                            </Link>
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
    } else {
      return (
        <div>
          <p>Something went wrong</p>
        </div>
      );
    }
  } catch (error) {
    return (
      <div>
        <p>Something went wrong</p>
      </div>
    );
  }
}

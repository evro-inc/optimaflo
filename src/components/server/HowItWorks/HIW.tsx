import React from 'react';
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

export default async function HowItWorks() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section className="w-full py-12 md:py-24 lg:py-32">
          {homePage.map(() => {
            return (
              <>
                <div className="container space-y-12 px-4 md:px-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                      <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">How It Works</div>
                      <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">A Simple Process</h2>
                      <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        OptimaFlo is designed to be easy to use and get you up and running your Google Data Flows in no time.
                      </p>
                    </div>
                  </div>
                  <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-2">

                    {homePage[0].howItWorks.map((hiw, index) => {
                      return (
                        <div key={index} className="grid gap-1">

                          <h3 className="text-lg font-bold">{hiw.title}</h3>
                          <p className="text-muted-foreground">{hiw.description}</p>
                        </div>
                      );
                    })}
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

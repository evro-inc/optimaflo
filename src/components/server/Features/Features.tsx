import React from 'react';
import { client } from '@/src/lib/sanity/sanity-utils';

type FeaturePage = {
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

// Set up the image URL builder
export default async function Features() {
  try {
    const homePage = await client.fetch<FeaturePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section className="w-full py-12 md:py-24 lg:py-32">
          {homePage.map(() => {
            return (
              <>
                <div className="container space-y-12 px-4 md:px-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                      <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                        Key Features
                      </div>
                      <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                        Why You Will Love OptimaFlo
                      </h2>
                      <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        OptimaFlo is designed to streamline your Google data workflows and boost
                        your productivity. Check out some of the key features that set us apart.
                      </p>
                    </div>
                  </div>
                  <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
                    {homePage[0].features.map((feature, index) => {
                      return (
                        <div key={index} className="grid gap-1">
                          <h3 className="text-lg font-bold">{feature.featureTitle}</h3>
                          <p className="text-muted-foreground">{feature.featureDescription}</p>
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

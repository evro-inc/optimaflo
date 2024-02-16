import React from 'react';
import imageUrlBuilder from '@sanity/image-url';
import { Images } from '../../client/Images/Images';
import { client } from '@/src/lib/sanity/sanity-utils';

const builder = imageUrlBuilder(client);

// Function to get the URL of an image
function urlFor(source) {
  return builder.image(source);
}

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

// Set up the image URL builder
export default async function Features() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section>
          {homePage.map(() => {
            return (
              <>
                <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-8 bg-offBackground">
                  <div className="text-left">
                    <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl pt-5 pb-10">
                      Explore Our Amazing Features
                    </h2>

                    <p className="text-lg">
                      OptimaFlo is not just a tool, but a comprehensive solution designed to address
                      the common challenges faced in managing large-scale data flows. Our suite of
                      features is built on the insights gained from extensive experience in the
                      field, and each one is designed to streamline your workflows, enhance your
                      data management, and provide you with actionable insights.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-28 gap-y-10 pt-10 justify-items-center">
                    {homePage[0].features.map((feature, index) => {
                      return (
                        <div
                          key={index}
                          className="flex flex-col items-left space-y-4 min-h-[200px] pb-10"
                        >
                          <Images
                            src={urlFor(feature.featureImage).url()}
                            alt="Google Tag Manager Logo"
                            width={50}
                            height={50}
                          />
                          <h2 className="font-bold">{feature.featureTitle}</h2>
                          <p>{feature.featureDescription}</p>
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

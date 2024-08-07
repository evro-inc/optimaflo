import React from 'react';
import { client } from '@/src/lib/sanity/sanity-utils';
import imageUrlBuilder from '@sanity/image-url';
import { Images } from '../../client/Images/Images';

// Set up the image URL builder
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

export default async function HowItWorks() {
  try {
    const homePage = await client.fetch<HomePage[]>(`*[_type == "homePage"]`);

    if (homePage && Array.isArray(homePage)) {
      return (
        <section>
          {homePage.map(() => {
            return (
              <>
                <div className="flex justify-center items-center">
                  <div className="grid grid-cols-1 lg:grid-cols-3 max-w-[85rem] mx-auto">
                    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-0 lg:py-24 space-y-8 col-span-2 order-2 lg:order-1">
                      <div className="gap-y-4 text-left ">
                        <div>
                          <h2 className="block font-medium text-2xl md:text-3xl lg:text-4xl pt-5 pb-10">
                            We make it easy to manage data flows across Google data products.
                          </h2>
                        </div>
                        <div>
                          <p className="text-lg">
                            OptimaFlo is not just a tool, but a comprehensive solution designed to
                            address the common challenges faced in managing large-scale data flows.
                            Our suite of features is built on the insights gained from extensive
                            experience in the field, and each one is designed to streamline your
                            workflows, enhance your data management, and provide you with actionable
                            insights.
                          </p>
                        </div>
                      </div>
                      <div className="pt-10 grid grid-cols-1 sm:grid-cols-2 gap-10">
                        {homePage[0].howItWorks.map((hiw, index) => {
                          return (
                            <div key={index} className="items-left space-y-4 min-h-[200px] pb-10">
                              <Images
                                src={urlFor(hiw.image).url()}
                                alt="Google Tag Manager Logo"
                                width={50}
                                height={50}
                              />
                              <h2 className="font-bold">{hiw.title}</h2>
                              <p>{hiw.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="h-full justify-self-center order-1 lg:order-2">
                      <div className="pt-20 lg:pt-[24rem]">
                        <Images
                          src="/hiw-image.jpg"
                          alt="Google Tag Manager Logo"
                          height={500}
                          width={500}
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
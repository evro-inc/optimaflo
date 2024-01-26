import { getAboutPage } from '@/src/lib/sanity/sanity-utils';
import { Images } from '@/src/components/client/Images/Images';
import CTA from '@/src/components/server/CTA/cta';
import FAQ from '@/src/components/server/FAQ/Faq';
import {client} from '@/src/lib/sanity/sanity-utils';

type AboutPage = {
    id: string;
    title: string;
    subheadingOne: string;
    mainImage: string;
    paragraphOne: string;
    subheadingTwo: string;
    paragraphTwo: string;
    subheadingThree: string;
    paragraphThree: string;
    teamMembers: {
      name: string;
      role: string;
      image: string;
    }[];
};
  

export default async function HowItWorks() {
  const aboutPage = await client.fetch<AboutPage[]>(`*[_type == "aboutPage"]`);

  return (
    <div>
      {aboutPage.map((page) => {
        return (
          <div key={page.id}>
            {/* Hero */}
            <section className="pb-24">
              <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
                <div className="mt-5 max-w-2xl text-center mx-auto">
                  <h1 className="block font-bold text-4xl md:text-5xl lg:text-6xl ">
                    {page.title}
                  </h1>

                  <p className="pt-10">{page.paragraphOne}</p>
                </div>
              </div>
              <div className="max-w-[85rem] mx-auto pt-10">
                <Images
                  src="/about-intro-image.svg"
                  alt="Google Tag Manager Logo"
                  height={2000}
                  width={2000}
                />
              </div>
            </section>
            {/* End Hero */}

            {/* Content */}

            <section className="bg-white-500 flex items-center pt-20 pb-10 sm:py-40">
              <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row">
                <div className="px-4 sm:px-6 lg:px-8 py-0 lg:py-24 flex flex-col space-y-8 lg:w-1/2">
                  <div className="flex flex-col gap-y-4 text-left">
                    <div>
                      <h2 className="font-medium text-2xl md:text-3xl lg:text-4xl pt-5 pb-10">
                        {page.subheadingTwo}
                      </h2>
                    </div>
                    <div>
                      <p className="text-lg">{page.paragraphTwo}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center sm:justify-end">
                  <div className="pt-14 sm:pt-16">
                    <Images
                      src="/about-section-one.svg"
                      alt="about-section-one"
                      height={525}
                      width={525}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white-500  flex flex-col-reverse lg:flex-row items-center pt-20 pb-10 sm:py-40">
              <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row">
                <div className="flex-1 flex items-center justify-center sm:justify-end order-last lg:order-none">
                  {' '}
                  {/* Added order-last and lg:order-none */}
                  <div className="pt-14 sm:pt-16">
                    <Images
                      src="/about-section-two.svg"
                      alt="about-section-two"
                      height={500}
                      width={500}
                    />
                  </div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8 py-0 lg:py-24 flex flex-col space-y-8 lg:w-1/2">
                  <div className="flex flex-col gap-y-4 text-left">
                    <div>
                      <h2 className="font-medium text-2xl md:text-3xl lg:text-4xl pt-5 pb-10">
                        {page.subheadingTwo}
                      </h2>
                    </div>
                    <div>
                      <p className="text-lg">{page.paragraphTwo}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
      }, [])}

      <FAQ />
      <CTA />
    </div>
  );
}

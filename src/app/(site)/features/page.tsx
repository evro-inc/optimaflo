import { getFeaturesPage } from '@/src/lib/sanity/sanity-utils';
import { Images } from '@/src/components/client/Images/Images';
import CTA from '@/src/components/server/CTA/cta';
import Features from '@/src/components/server/Features/Features';

export default async function FeaturePage() {
  const feature = await getFeaturesPage();

  return (
    <div>
      {feature.map((page) => {
        return (
          <>
            {/* Hero */}
            <section className="pb-24" key={page.id}>
              <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
                <div className="mt-5 max-w-2xl text-center mx-auto">
                  <h1 className="block font-bold text-4xl md:text-5xl lg:text-6xl ">
                    {page.title}
                  </h1>
                  <p className="pt-10">{page.SubTitle}</p>
                </div>
              </div>
            </section>
            {/* End Hero */}

            {/* Features */}
            <section className="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
              {/* Grid */}
              <div className="md:grid md:grid-cols-2 md:items-center md:gap-12 xl:gap-32">
                <div>
                  <Images
                    src="https://images.unsplash.com/photo-1648737963503-1a26da876aca?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=900&h=900&q=80"
                    alt="Image Description"
                    width={500}
                    height={500}
                  />
                </div>
                {/* End Col */}

                <div className="mt-5 sm:mt-10 lg:mt-0">
                  <div className="space-y-6 sm:space-y-8">
                    {/* Title */}
                    <div className="space-y-2 md:space-y-4">
                      <h2 className="font-bold text-3xl lg:text-4xl text-gray-800 dark:text-gray-200">
                        {page.SubheadingOne}
                      </h2>
                      <p className="text-gray-500">{page.SubheadingOneA}</p>
                    </div>
                    {/* End Title */}

                    {/* List */}

                    {page.howItWorksSteps.map((step) => (
                      <>
                        <ul role="list" className="space-y-2 sm:space-y-4">
                          <li key={step.stepTitle} className="flex space-x-3">
                            {/* Solid Check */}
                            <svg
                              className="flex-shrink-0 h-6 w-6"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M15.1965 7.85999C15.1965 3.71785 11.8387 0.359985 7.69653 0.359985C3.5544 0.359985 0.196533 3.71785 0.196533 7.85999C0.196533 12.0021 3.5544 15.36 7.69653 15.36C11.8387 15.36 15.1965 12.0021 15.1965 7.85999Z"
                                fill="currentColor"
                                fill-opacity="0.1"
                              />
                              <path
                                d="M10.9295 4.88618C11.1083 4.67577 11.4238 4.65019 11.6343 4.82904C11.8446 5.00788 11.8702 5.32343 11.6914 5.53383L7.44139 10.5338C7.25974 10.7475 6.93787 10.77 6.72825 10.5837L4.47825 8.5837C4.27186 8.40024 4.25327 8.0842 4.43673 7.87781C4.62019 7.67142 4.93622 7.65283 5.14261 7.83629L7.01053 9.49669L10.9295 4.88618Z"
                                fill="currentColor"
                              />
                            </svg>
                            {/* End Solid Check */}

                            <span className="text-sm sm:text-base text-gray-500">
                              <span className="font-bold block">
                                {step.stepTitle}
                              </span>{' '}
                              {step.stepDescription}
                            </span>
                          </li>
                        </ul>
                      </>
                    ))}

                    {/* End List */}
                  </div>
                </div>
                {/* End Col */}
              </div>
              {/* End Grid */}
            </section>
            {/* End Features */}

            <Features />
            <CTA />
          </>
        );
      })}
    </div>
  );
}

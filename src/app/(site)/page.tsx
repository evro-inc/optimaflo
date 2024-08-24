import React from 'react';
import Features from '@/src/components/server/Features/Features';
import HIW from '@/src/components/server/HowItWorks/HIW';
import FAQ from '@/src/components/server/FAQ/Faq';
import CTA from '@/src/components/server/cta';
import Banner from '@/src/components/server/banner';
import Hero from '@/src/components/server/Hero';
import Integrations from '@/src/components/server/Integrations';

/* import Integrations from '@/src/components/server/Block/Integrations';

import Hero from '@/src/components/server/Hero/Hero'; */

export default async function Home() {
  return (
    <main>
      <div className="flex flex-col min-h-dvh">
        {/* <WaitlistForm /> */}
        <Hero />
        <Integrations />
        <Banner />
        <Features />
        <HIW />
        <FAQ />
        <CTA />
      </div>
    </main>
  );
}

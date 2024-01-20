import React from 'react';

import Integrations from '@/src/components/server/Block/Integrations';
import Features from '@/src/components/server/Features/Features';
import FAQ from '@/src/components/server/FAQ/Faq';
import HIW from '@/src/components/server/HowItWorks/HIW';
import CTA from '@/src/components/server/CTA/cta';
import Hero from '@/src/components/server/Hero/Hero';

export default async function Home() {
  return (
    <main>
      <Hero />

      <Features />
      <HIW />
      <Integrations />
      <FAQ />
      <CTA />
    </main>
  );
}

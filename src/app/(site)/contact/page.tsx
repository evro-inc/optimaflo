import { ContactForm } from '@/src/components/client/Form/Form';
import FAQ from '@/src/components/server/FAQ/Faq';
import { Suspense } from 'react';

export default async function contact() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <div className="py-10">
          <ContactForm />
        </div>
        <FAQ />
      </Suspense>
    </>
  );
}

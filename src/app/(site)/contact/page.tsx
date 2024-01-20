import { ContactForm } from '@/src/components/client/Form/Form';
import FAQ from '@/src/components/server/FAQ/Faq';

export default async function contact() {
  return (
    <>
      <div className="py-10">
        <ContactForm />
      </div>
      <FAQ />
    </>
  );
}

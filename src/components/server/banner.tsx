import Image from 'next/image';
import bahIcon from 'public/bah.svg';
import acsIcon from 'public/acs.svg';
import dtIcon from 'public/digitalTurbine.svg';
import hhsIcon from 'public/hhs.svg';
import nihIcon from 'public/nih.svg';

export default function Banner() {
  return (
    <section className="w-full py-4 md:py-14 lg:py-14 bg-primary">
      <div className="container grid max-w-5xl items-center justify-center gap-4 px-4 text-center md:gap-8 md:px-6 lg:grid-cols-1 xl:max-w-6xl xl:gap-10">
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-xl md:text-3xl">
              Companies I Have Worked With
            </h2>
            <p className="mx-auto max-w-[700px] text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Trusted by leading organizations in various industries.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 items-center justify-center gap-4 md:grid-cols-5">
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Image priority src={bahIcon} alt="Booz Allen Hamilton" className="object-contain" />
          </div>
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Image
              priority
              src={acsIcon}
              alt="American Chemical Society"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Image
              priority
              src={hhsIcon}
              alt="Health and Human Services"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Image
              priority
              src={nihIcon}
              alt="National Institute of Health"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-center p-4 sm:p-8">
            <Image priority src={dtIcon} alt="Digital Turbine" className="object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}

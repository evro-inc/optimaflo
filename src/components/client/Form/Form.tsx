'use client';

import { FormEvent, useState } from 'react';
import { Images } from '../Images/Images';
import { ButtonPrim } from '../Button/Button';
import { LinkBody } from '../Links/Links';

export const ContactForm = () => {
  const [isSubmitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Validation state
  const [nameValid, setNameValid] = useState(true);
  const [emailValid, setEmailValid] = useState(true);
  const [messageValid, setMessageValid] = useState(true);

  const validateEmail = (email) => {
    // Simple email validation
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Validate name
    setNameValid(name.trim().length > 0);

    // Validate email
    setEmailValid(validateEmail(email));

    // Validate message
    setMessageValid(message.trim().length > 0);

    if (nameValid && emailValid && messageValid) {
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          body: JSON.stringify({
            event: 'contact',
            name,
            email,
            message,
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
          },
        });
        if (res.status === 200) {
          setSubmitted(true);
        }
      } catch (err: any) {
        console.error('Err', err);
      }
    }
  };

  return isSubmitted ? (
    <div className="transition-all duration-500 ease-in-out text-xl md:text-3xl py-20">
      <p className="text-center font-semibold text-blue-500 pb-5">
        Thank you for your message!
      </p>
      <p className="text-center text-gray-600">
        We have received your inquiry and will get back to you in 3-5 business
        days.
      </p>
    </div>
  ) : (
    <>
      {/* Contact Us */}
      <div className="max-w-[85rem] mx-auto py-16 px-0 sm:px-6 lg:px-8 text-left">
        <div className="mt-12 flex flex-col lg:flex-row items-center sm:items-start gap-6 lg:gap-16">
          <div className="divide-y divide-gray-200 order-1 w-6/12 flex items-end">
            <div>
              <h1 className="text-2xl font-bold sm:text-4xl pb-5 text-blue-300">
                Get In Touch
              </h1>
              <p className="mt-1 text-gray-600">
                We would love to talk about how we can help you. If you have any
                questions, suggestions, feature requests, or would like to
                discuss a project; please get in touch.
              </p>

              <div className="mt-4 text-gray-600">
                PO Box 96503
                <br />
                PMB 52148
                <br />
                Washington, District of Columbia 20090-6503 US
              </div>
              <div className="py-10 sm:py-20">
                <Images
                  src="/dc.png"
                  alt="Location of OptimaFlo, Washington DC"
                  width={500}
                  height={500}
                />
              </div>
            </div>
          </div>
          {/* Card */}
          <div className="flex flex-col border border-gray-300 rounded-lg shadow-md p-4 sm:p-6 lg:p-8 order-2">
            <form onSubmit={onSubmit}>
              <div className="grid gap-4">
                <div>
                  <label htmlFor="hs-name-contacts-1" className="sr-only">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    name="hs-name-contacts-1"
                    id="hs-name-contacts-1"
                    className={`py-3 px-4 block w-full rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-300 ease-in-out hover:border-gray-400 ${
                      nameValid
                        ? 'border-2 border-gray-300'
                        : 'border-2 border-red-500'
                    }`}
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label htmlFor="hs-email-contacts-1" className="sr-only">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    name="hs-email-contacts-1"
                    id="hs-email-contacts-1"
                    autoComplete="email"
                    className={`py-3 px-4 block w-full rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-300 ease-in-out hover:border-gray-400 ${
                      emailValid
                        ? 'border-2 border-gray-300'
                        : 'border-2 border-red-500'
                    }`}
                    placeholder="Email"
                  />
                </div>

                <div>
                  <label htmlFor="hs-about-contacts-1" className="sr-only">
                    Details
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="hs-about-contacts-1"
                    name="hs-about-contacts-1"
                    className={`py-3 px-4 block w-full rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition duration-300 ease-in-out hover:border-gray-400 ${
                      messageValid
                        ? 'border-2 border-gray-300'
                        : 'border-2 border-red-500'
                    }`}
                    placeholder="Details"
                  ></textarea>
                </div>
              </div>
              {/* End Grid */}

              <div className="mt-3 text-center">
                <p className="text-sm text-gray-500">
                  We collect your personal information here to be able to
                  identify and contact you. Learn more in our{' '}
                  <LinkBody
                    variant="link"
                    text="Privacy Policy"
                    href="/privacy"
                    ariaLabel="Privacy Policy"
                  />
                  .
                </p>
              </div>

              <div className="flex justify-center pt-5">
                <ButtonPrim
                  variant="body"
                  type="submit"
                  text="Send"
                  billingInterval={undefined}
                />
              </div>

              <div className="mt-3 text-center">
                <p className="text-sm text-gray-500">
                  We will get back to you in 3-5 business days.
                </p>
              </div>
            </form>
          </div>
          {/* End Card */}
        </div>
      </div>
      {/* End Contact Us */}
    </>
  );
};

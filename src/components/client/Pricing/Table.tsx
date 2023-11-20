'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Price } from '@prisma/client';
import { ProductWithPrice } from 'types/types';
import { postData } from '@/src/lib/helpers';
import { getStripe } from '@/src/lib/stripe-client';
import { Button, ButtonSubscribe } from '../Button/Button';
import logger from '@/src/lib/logger';
import { LinkBody } from '../Links/Links';
import { useSelector } from 'react-redux';
import { selectUser } from '@/src/app/redux/userSlice';
import { useUserDetails, useSubscription } from '@/src/lib/hooks/user';
import { useAuth } from '@clerk/nextjs';

interface Props {
  products: ProductWithPrice[];
}

type BillingInterval = 'year' | 'month' | 'day';

export default function PricingTable({ products = [] }: Props) {
  const router = useRouter();
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('day');

  const [, /* priceIdLoading */ setPriceIdLoading] = useState<string>();
  const { subscription } = useSelector(selectUser);

  const [showAlert, setShowAlert] = useState(false);
  const { userId } = useAuth();

  const handleCheckout = async (price: Price, product: ProductWithPrice) => {
    try {
      setPriceIdLoading(price.id);
      if (!userId) {
        setShowAlert(true); // Show the alert if there's no session
        return;
      } else {
        setShowAlert(false); // Hide the alert if there is a session
      }
      if (product.name === (subscription as any)?.Price?.Product?.name) {
        // If they do, redirect to the Stripe customer portal
        const { url } = await postData({
          url: '/api/create-portal-link',
          data: { customerId: (subscription as any)?.User?.Customer?.id }, // replace with the actual customer id
        });

        if (!url) {
          throw new Error('Failed to generate billing portal URL');
        }

        //nextjs redirect
        router.push(url);
      } else {
        const { sessionId } = await postData({
          url: '/api/create-checkout-session',
          data: { price },
        });

        const stripe = await getStripe();
        if (!stripe) {
          throw new Error('Stripe failed to initialize');
        }
        await stripe.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      logger.error((error as Error)?.message);
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  return (
    <>
      {showAlert && (
        <div
          className="bg-red-500 text-sm text-white-500 rounded-md p-4"
          role="alert"
        >
          <span className="font-bold">UH OH!</span> Please log in or sign up to
          subscribe.{' '}
          <LinkBody
            href="/auth/signin"
            variant="warning"
            text="Log In/Sign Up"
            ariaLabel="Notification to log in or sign up before subscribing"
          />
        </div>
      )}
      <section>
        {/* Hero */}
        <div>
          <div className="max-w-[85rem] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14 mx-auto">
            {/* Title */}
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h1 className="text-3xl leading-tight font-bold md:text-4xl md:leading-tight lg:text-5xl lg:leading-tight text-blue-300">
                Choose the Plan That&#39;s Right for Your Business
              </h1>
              <p className="mt-2 lg:text-lg text-black-500 ">
                Whatever your status, our offers evolve according to your needs.
              </p>
            </div>
            {/* End Title */}

            {/* Switch */}

            <div className="flex justify-center items-center">
              <div className="flex-inline border rounded-full p-1">
                <ButtonSubscribe
                  variant="subscribe"
                  text="Monthly"
                  isSelected={billingInterval === 'month'}
                  onClick={() => setBillingInterval('month')}
                  type="button"
                  billingInterval={undefined}
                />

                <ButtonSubscribe
                  variant="subscribe"
                  text="Yearly"
                  isSelected={billingInterval === 'year'}
                  onClick={() => setBillingInterval('year')}
                  type="button"
                  billingInterval={undefined}
                />
                <ButtonSubscribe
                  variant="subscribe"
                  text="daily"
                  isSelected={billingInterval === 'day'}
                  onClick={() => setBillingInterval('day')}
                  type="button"
                  billingInterval={undefined}
                />
              </div>
            </div>
            {/* End Switch */}
          </div>
        </div>

        <div>
          {/* Grid */}
          <div className="mt-12 px-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:items-center">
            {products.map((product) => {
              const price = product?.Price?.find(
                (price) => price.interval === billingInterval
              );

              if (!price) return null;

              const priceString = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: price.currency,
                minimumFractionDigits: 0,
              }).format(((price as any)?.unitAmount || 0) / 100);

              return (
                <>
                  {/*Card */}
                  <div
                    key={product.id}
                    className="flex flex-col border border-gray-200 text-center rounded-xl p-8 "
                  >
                    <h4 className="font-medium text-lg text-gray-800 ">
                      {product.name}
                    </h4>
                    <span className="mt-7 font-bold text-5xl text-gray-800 ">
                      {priceString}
                    </span>
                    <p className="mt-2 text-sm text-gray-500">
                      {product.description}
                    </p>

                    <ul className="mt-7 space-y-2.5 text-sm">
                      <li className="flex space-x-2">
                        <svg
                          className="flex-shrink-0 h-5 w-5 text-blue-600"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5219 4.0949C11.7604 3.81436 12.181 3.78025 12.4617 4.01871C12.7422 4.25717 12.7763 4.6779 12.5378 4.95844L6.87116 11.6251C6.62896 11.91 6.1998 11.94 5.9203 11.6916L2.9203 9.02494C2.64511 8.78033 2.62032 8.35894 2.86493 8.08375C3.10955 7.80856 3.53092 7.78378 3.80611 8.02839L6.29667 10.2423L11.5219 4.0949Z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="text-gray-800 ">1 user</span>
                      </li>

                      <li className="flex space-x-2">
                        <svg
                          className="flex-shrink-0 h-5 w-5 text-blue-600"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5219 4.0949C11.7604 3.81436 12.181 3.78025 12.4617 4.01871C12.7422 4.25717 12.7763 4.6779 12.5378 4.95844L6.87116 11.6251C6.62896 11.91 6.1998 11.94 5.9203 11.6916L2.9203 9.02494C2.64511 8.78033 2.62032 8.35894 2.86493 8.08375C3.10955 7.80856 3.53092 7.78378 3.80611 8.02839L6.29667 10.2423L11.5219 4.0949Z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="text-gray-800 ">Plan features</span>
                      </li>

                      <li className="flex space-x-2">
                        <svg
                          className="flex-shrink-0 h-5 w-5 text-blue-600"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.5219 4.0949C11.7604 3.81436 12.181 3.78025 12.4617 4.01871C12.7422 4.25717 12.7763 4.6779 12.5378 4.95844L6.87116 11.6251C6.62896 11.91 6.1998 11.94 5.9203 11.6916L2.9203 9.02494C2.64511 8.78033 2.62032 8.35894 2.86493 8.08375C3.10955 7.80856 3.53092 7.78378 3.80611 8.02839L6.29667 10.2423L11.5219 4.0949Z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="text-gray-800 ">Product support</span>
                      </li>
                    </ul>

                    <div className="justify-center pt-5">
                      <Button
                        variant="signup"
                        text={
                          subscription &&
                          product.name ===
                            (subscription as any)?.price?.Product?.name
                            ? 'Manage'
                            : 'Subscribe'
                        }
                        isSelected={billingInterval === 'month'}
                        onClick={() => handleCheckout(price as any, product)}
                        type="button"
                        billingInterval={undefined}
                      />
                    </div>
                  </div>
                  {/*End Card */}
                </>
              );
            })}
          </div>
          {/* End Grid */}
        </div>
        {/* End Hero */}
      </section>

      <div>
        <div className="mt-20 lg:mt-32">
          <div className="lg:text-center mb-10 lg:mb-20">
            <h3 className="text-2xl font-semibold ">Compare plans</h3>
          </div>

          {/*xs to lg */}
          <div className="space-y-24 lg:hidden">
            <section>
              <div className="px-4 mb-4">
                <h2 className="text-lg leading-6 font-medium text-gray-800">
                  Free
                </h2>
              </div>
              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Tag Manager
                </caption>
                <thead className="sticky top-0 inset-x-0 bg-white ">
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Open/High/Low/Close
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Price-volume difference indicator
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Analytics 4
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Network growth
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Average token age consumed
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Exchange flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total ERC20 exchange funds flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Transaction volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total circulation (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Velocity of tokens (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      ETH gas used
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  AI
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Dev activity
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Topic search
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Relative social dominance
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total social volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <div className="px-4 mb-4">
                <h2 className="text-lg leading-6 font-medium text-gray-800">
                  Startup
                </h2>
              </div>
              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Tag Manager
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Open/High/Low/Close
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Price-volume difference indicator
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Analytics 4
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Network growth
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Average token age consumed
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Exchange flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total ERC20 exchange funds flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Transaction volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total circulation (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Velocity of tokens (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      ETH gas used
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  AI
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Dev activity
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Topic search
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Relative social dominance
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total social volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <div className="px-4 mb-4">
                <h2 className="text-lg leading-6 font-medium text-gray-800">
                  Team
                </h2>
              </div>
              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Tag Manager
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Open/High/Low/Close
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Price-volume difference indicator
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Analytics 4
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Network growth
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Average token age consumed
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Exchange flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total ERC20 exchange funds flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Transaction volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total circulation (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Velocity of tokens (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      ETH gas used
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  AI
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Dev activity
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Topic search
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Relative social dominance
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total social volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Minus */}
                      <svg
                        className="ml-auto h-7 w-7 text-gray-400"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clip-rule="evenodd"
                          d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*Minus */}
                      <span className="sr-only">No</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <div className="px-4 mb-4">
                <h2 className="text-lg leading-6 font-medium text-gray-800">
                  Enterprise
                </h2>
              </div>
              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Tag Manager
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Open/High/Low/Close
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Price-volume difference indicator
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  Google Analytics 4
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Network growth
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Average token age consumed
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Exchange flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total ERC20 exchange funds flow
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Transaction volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total circulation (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Velocity of tokens (beta)
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      ETH gas used
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full">
                <caption className="bg-gray-50 border-t border-gray-200 py-3 px-4 text-sm font-bold text-gray-800 text-left ">
                  AI
                </caption>
                <thead>
                  <tr>
                    <th className="sr-only" scope="col">
                      Feature
                    </th>
                    <th className="sr-only" scope="col">
                      Included
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 ">
                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Dev activity
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Topic search
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Relative social dominance
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>

                  <tr className="border-t border-gray-200 ">
                    <th
                      className="py-5 px-4 text-sm font-normal text-gray-600 text-left "
                      scope="row"
                    >
                      Total social volume
                    </th>
                    <td className="py-5 pr-4">
                      {/*Check */}
                      <svg
                        className="ml-auto h-7 w-7 text-blue-600"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                          fill="currentColor"
                        />
                      </svg>
                      {/*End Solid Check */}
                      <span className="sr-only">Yes</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>
          {/*End xs to lg */}

          {/*lg+ */}
          <div className="hidden lg:block">
            <table className="w-2/3 h-px mx-auto">
              <caption className="sr-only">Pricing plan comparison</caption>
              <thead>
                <tr>
                  <th
                    className="pb-4 pl-6 pr-6 text-sm font-medium text-gray-800 text-left"
                    scope="col"
                  >
                    <span className="sr-only">Feature by</span>
                    <span className="">Plans</span>
                  </th>

                  <th
                    className="w-1/4 pb-4 px-6 text-lg leading-6 font-medium text-gray-800 text-center "
                    scope="col"
                  >
                    Free
                  </th>
                  <th
                    className="w-1/4 pb-4 px-6 text-lg leading-6 font-medium text-gray-800 text-center "
                    scope="col"
                  >
                    Startup
                  </th>
                  <th
                    className="w-1/4 pb-4 px-6 text-lg leading-6 font-medium text-gray-800 text-center "
                    scope="col"
                  >
                    Team
                  </th>
                  <th
                    className="w-1/4 pb-4 px-6 text-lg leading-6 font-medium text-gray-800 text-center "
                    scope="col"
                  >
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="border-t border-gray-200 divide-y divide-gray-200 ">
                <tr>
                  <th
                    className="py-3 pl-6 bg-gray-50 font-bold text-gray-800 text-left "
                    colspan="5"
                    scope="colgroup"
                  >
                    Google Tag Manager
                  </th>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Open/High/Low/Close
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Price-volume difference indicator
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-3 pl-6 bg-gray-50 font-bold text-gray-800 text-left "
                    colspan="5"
                    scope="colgroup"
                  >
                    Google Analytics 4
                  </th>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Network growth
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Average token age consumed
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Exchange flow
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Total ERC20 exchange funds flow
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Transaction volume
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Total circulation (beta)
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Velocity of tokens (beta)
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    ETH gas used
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Not included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-3 pl-6 bg-gray-50 font-bold text-gray-800 text-left "
                    colspan="5"
                    scope="colgroup"
                  >
                    AI
                  </th>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Dev activity
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Topic search
                  </th>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Check */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*End Solid Check */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  >
                    Relative social dominance
                  </th>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Included in Free</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-gray-400"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clip-rule="evenodd"
                        d="M4.5 9.00005C4.5 8.8807 4.56773 8.76624 4.68829 8.68185C4.80885 8.59746 4.97236 8.55005 5.14286 8.55005H12.8571C13.0276 8.55005 13.1912 8.59746 13.3117 8.68185C13.4323 8.76624 13.5 8.8807 13.5 9.00005C13.5 9.1194 13.4323 9.23386 13.3117 9.31825C13.1912 9.40264 13.0276 9.45005 12.8571 9.45005H5.14286C4.97236 9.45005 4.80885 9.40264 4.68829 9.31825C4.56773 9.23386 4.5 9.1194 4.5 9.00005Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Included in Startup</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Included in Team</span>
                  </td>

                  <td className="py-5 px-6">
                    {/*Minus */}
                    <svg
                      className="mx-auto h-7 w-7 text-blue-600"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.2468 5.11462C10.4058 4.91006 10.6862 4.88519 10.8733 5.05907C11.0603 5.23295 11.0831 5.53972 10.9241 5.74428L7.1463 10.6054C6.98484 10.8131 6.69873 10.835 6.5124 10.6539L4.5124 8.70944C4.32894 8.53108 4.31241 8.22382 4.47549 8.02316C4.63856 7.8225 4.91948 7.80443 5.10294 7.98279L6.76331 9.59707L10.2468 5.11462Z"
                        fill="currentColor"
                      />
                    </svg>
                    {/*Minus */}
                    <span className="sr-only">Included in Enterprise</span>
                  </td>
                </tr>

                <tr>
                  <th
                    className="py-5 pl-6 pr-6 text-sm font-normal text-gray-600 text-left "
                    scope="row"
                  ></th>

                  {products.map((product) => {
                    const price = product?.Price?.find(
                      (price) => price.interval === billingInterval
                    );
                    if (!price) return null;

                    return (
                      <td className="py-5 px-6" key={product.id}>
                        {/*Check */}
                        <div className="justify-center pt-5">
                          <Button
                            variant="signup"
                            text={
                              subscription &&
                              product.name ===
                                (subscription as any)?.price?.Product?.name
                                ? 'Manage'
                                : 'Subscribe'
                            }
                            isSelected={billingInterval === 'month'}
                            onClick={() =>
                              handleCheckout(price as any, product)
                            }
                            type="button"
                            billingInterval={undefined}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          {/*End lg+ */}
        </div>
      </div>
    </>
  );
}

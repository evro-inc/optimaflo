'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { selectSubscriber } from '../../redux/subscriberSlice';
import { setLoading } from '../../redux/globalSlice';
import { postData } from '@/src/lib/helpers';
import React from 'react';
import { Button } from '@/src/components/client/Button/Button';
import LoadingDots from '@/src/components/server/LoadingDots/LoadingDots';
import logger from '@/src/lib/logger';
import { useSession } from '@clerk/nextjs';

interface Props {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

function Card({ title, description, footer, children }: Props) {
  return (
    <div className="border border-zinc-700	max-w-3xl w-full p rounded-md m-auto my-8">
      <div className="px-5 py-4">
        <h3 className="text-2xl mb-1 font-medium">{title}</h3>
        <p className="text-zinc-300">{description}</p>
        {children}
      </div>
      <div className="border-t border-zinc-700 bg-zinc-900 p-4 text-zinc-500 rounded-b-md">
        {footer}
      </div>
    </div>
  );
}

export default function Profile() {
  const dispatch = useDispatch();

  const { subscription, isLoading } = useSelector(selectSubscriber);

  const { session } = useSession();

  const redirectToCustomerPortal = async () => {
    dispatch(setLoading(true));
    try {
      const { url } = await postData({
        url: '/api/create-portal-link',
      });
      window.location.assign(url);
    } catch (error) {
      if (error) return logger.error((error as Error).message);
    }
    dispatch(setLoading(false));
  };

  const subscriptionPrice =
    (subscription as any)?.Price &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (subscription as any)?.price?.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(((subscription as any)?.price?.unitAmount || 0) / 100);

  return (
    <section className="bg-black mb-32">
      <div className="max-w-6xl mx-auto pt-8 sm:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:flex-col sm:align-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Account
          </h1>
          <p className="mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl max-w-2xl m-auto">
            We partnered with Stripe for a simplified billing.
          </p>
        </div>
      </div>
      <div className="p-4">
        <Card
          title="Your Plan"
          description={
            subscription
              ? `You are currently on the ${
                  (subscription as any)?.price?.Product?.name
                } plan.`
              : ''
          }
          footer={
            <div className="flex items-start justify-between flex-col sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">
                Manage your subscription on Stripe.
              </p>
              <Button
                billingInterval={''}
                text="Open customer portal"
                variant="slim"
                loading={isLoading}
                disabled={isLoading || !subscription}
                onClick={redirectToCustomerPortal}
              />
            </div>
          }
        >
          <div className="text-xl mt-8 mb-4 font-semibold">
            {isLoading ? (
              <div className="h-12 mb-6">
                <LoadingDots />
              </div>
            ) : subscription ? (
              `${subscriptionPrice}/${(subscription as any)?.Price?.interval}`
            ) : (
              <Link href="/">Choose your plan</Link>
            )}
          </div>
        </Card>
        <Card
          title="Your Name"
          description="Please enter your full name, or a display name you are comfortable with."
          footer={<p>Please use 64 characters at maximum.</p>}
        >
          <div className="text-xl mt-8 mb-4 font-semibold">
            {session?.user ? (
              `${session?.user?.name || session?.user?.email}`
            ) : (
              <div className="h-8 mb-6">
                <LoadingDots />
              </div>
            )}
          </div>
        </Card>
        <Card
          title="Your Email"
          description="Please enter the email address you want to use to login."
          footer={<p>We will email you to verify the change.</p>}
        >
          <p className="text-xl mt-8 mb-4 font-semibold">
            {session?.user ? session?.user.email : undefined}
          </p>
        </Card>
      </div>
    </section>
  );
}

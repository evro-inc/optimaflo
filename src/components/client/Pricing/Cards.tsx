'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Price } from '@prisma/client';
import { ProductWithPrice } from '@/src/lib/types/types';
import { postData } from '@/src/lib/helpers';
import { getStripe } from '@/src/lib/stripe-client';
import { useSelector } from 'react-redux';
import { selectUser } from '@/src/lib/redux/userSlice';
import { useAuth } from '@clerk/nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Button } from '../../ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

interface Props {
  products: ProductWithPrice[];
}

export default function PricingCards({ products = [] }: Props) {
  const router = useRouter();

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
    } catch (error: any) {
      throw new Error(error);
    } finally {
      setPriceIdLoading(undefined);
    }
  };
  const allIntervals = [
    ...new Set(
      products.flatMap((product) =>
        product.Price.map((price) => price.interval)
      )
    ),
  ];

  // sort products by price
  const sortedProducts = products.sort((a, b) => {
    const aPrice: any = a.Price.find((p) => p.interval === 'month');
    const bPrice: any = b.Price.find((p) => p.interval === 'month');
    if (!aPrice || !bPrice) return 0;
    return aPrice.unitAmount - bPrice.unitAmount;
  });

  return (
    <>
      {showAlert && (
        <div
          className="bg-red-500 text-sm text-white-500 rounded-md p-4"
          role="alert"
        >
          <span className="font-bold">UH OH!</span> Please log in or sign up to
          subscribe.
          <Button variant="destructive" asChild>
            <Link
              href="/auth/signin"
              aria-label="Notification to log in or sign up before subscribing"
            >
              Log In/Sign Up
            </Link>
          </Button>
        </div>
      )}

      {/* Hero */}

      {/* End Grid */}

      <div className="flex justify-center">
        <Tabs defaultValue={allIntervals[0]} className="w-4/5">
          <TabsList className="grid w-96 grid-cols-2 mx-auto">
            {allIntervals.map((interval) => (
              <TabsTrigger
                key={interval}
                value={interval!}
                className="px-2 py-1"
              >
                {interval!.charAt(0).toUpperCase() + interval!.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          {allIntervals.map((interval) => (
            <TabsContent key={interval} value={interval!} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-around items-end">
                {sortedProducts.map((product) => {
                  const price: any = product.Price.find(
                    (p) => p.interval === interval
                  );
                  if (!price) return null;
                  return (
                    <Card key={product.id} className="flex flex-col h-full">
                      <div className="flex flex-col justify-between flex-grow">
                        <CardHeader>
                          <CardTitle>{product.name}</CardTitle>
                          <CardDescription className="h-20 overflow-hidden text-ellipsis">
                            {product.description}
                          </CardDescription>
                          <Separator className="my-4" />
                        </CardHeader>
                        <CardContent className="text-4xl font-bold">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: price.currency,
                            minimumFractionDigits: 0,
                          }).format(price.unitAmount / 100)}{' '}
                          <span className="text-base capitalize">
                            Per {price.interval}
                          </span>
                        </CardContent>

                        <CardContent className="grid gap-2">
                          <ul className="grid gap-2 text-sm">
                            <li>{product?.metadata?.bulletOne}</li>
                            <li>{product?.metadata?.bulletTwo}</li>
                            <li>{product?.metadata?.bulletThree}</li>
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => handleCheckout(price, product)}
                          >
                            {subscription &&
                            product.name === subscription.price?.Product?.name
                              ? 'Manage'
                              : 'Subscribe'}
                          </Button>
                        </CardFooter>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
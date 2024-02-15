import { NextResponse, NextRequest } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getURL } from '@/src/utils/helpers';
import prisma from '@/src/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

export async function POST(request: NextRequest) {
  const user = await currentUser();
  const { userId } = auth();

  if (!user) return notFound();

  const { price, quantity = 1, metadata = {} } = await request.json();

  try {
    let customer;

    // Query the customer from the Prisma customer table using the user's ID
    const customerRecord = await prisma.customer.findFirst({
      where: {
        userId: userId,
      },
    });

    // If the customer record was found, use its ID in the fetch call
    if (customerRecord && customerRecord.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(
          customerRecord.stripeCustomerId
        );
      } catch (error) {
        customer = await stripe.customers.create({
          email: user?.emailAddresses[0].emailAddress,
        });

        // Update the customer record in Prisma with the new Stripe Customer ID
        await prisma.customer.update({
          where: { id: customerRecord.id },
          data: { stripeCustomerId: customer.id },
        });
      }
    } else {
      // If the customer record was not found, create a new one
      customer = await stripe.customers.create({
        email: user?.emailAddresses[0].emailAddress,
      });

      // Create a new customer record in Prisma with the Stripe Customer ID
      await prisma.customer.create({
        data: {
          userId: userId,
          stripeCustomerId: customer.id,
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      customer: customer.id,
      line_items: [
        {
          price: price.id,
          quantity,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata,
      },
      success_url: `${getURL()}/profile`,
      cancel_url: `${getURL()}/`,
    });

    return new NextResponse(JSON.stringify({ sessionId: checkoutSession.id }), {
      status: 200,
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}

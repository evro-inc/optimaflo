import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/src/lib/stripe';
import { getURL } from '@/src/lib/helpers';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/src/lib/prisma';
import logger from '@/src/lib/logger';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user?.id || !session.user?.email) {
    throw new Error('Not authenticated');
  }

  const { price, quantity = 1, metadata = {} } = await request.json();

  try {
    let customer;

    // Query the customer from the Prisma customer table using the user's ID
    const customerRecord = await prisma.customer.findFirst({
      where: {
        userId: session.user?.id,
      },
    });

    // If the customer record was found, use its ID in the fetch call
    if (customerRecord && customerRecord.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(
          customerRecord.stripeCustomerId
        );
      } catch (error) {
        logger.error({
          message: 'Customer not found in Stripe',
          userId: session.user?.id,
          error,
        });

        customer = await stripe.customers.create({
          email: session.user?.email,
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
        email: session.user?.email,
      });

      // Create a new customer record in Prisma with the Stripe Customer ID
      await prisma.customer.create({
        data: {
          userId: session.user?.id,
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
        trial_from_plan: true,
        metadata,
      },
      success_url: `${getURL()}/profile`,
      cancel_url: `${getURL()}/`,
    });

    return new NextResponse(JSON.stringify({ sessionId: checkoutSession.id }), {
      status: 200,
    });
  } catch (err: any) {
    logger.error({
      message: 'Error creating checkout session',
      userId: session.user?.id,
      error: err,
    });
    return new NextResponse(err.message, { status: 500 });
  }
}

import { stripe } from '@/src/lib/stripe';
import { getURL } from '@/src/lib/helpers';
import { NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import { currentUser } from '@clerk/nextjs';

export async function POST() {
  const user = await currentUser();

  try {
    if (!user || !user?.id || !user?.emailAddresses) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = user;
    const email = user.emailAddresses[0].emailAddress;

    let customer;

    // Query the customer from the Prisma customer table using the user's ID
    const customerRecord = await prisma.customer.findFirst({
      where: {
        userId: id,
      },
    });

    // If the customer record was found, use its ID in the fetch call
    if (customerRecord && customerRecord.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(
          customerRecord.stripeCustomerId
        );
      } catch (error) {
        customer = await stripe.customers.create({ email });

        // Update the customer record in Prisma with the new Stripe Customer ID
        await prisma.customer.update({
          where: { id: customerRecord.id },
          data: { stripeCustomerId: customer.id },
        });
      }
    } else {
      // If the customer record was not found, create a new one
      customer = await stripe.customers.create({ email });

      // Create a new customer record in Prisma with the Stripe Customer ID
      await prisma.customer.create({
        data: {
          userId: id,
          stripeCustomerId: customer.id,
        },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${getURL()}/profile`,
    });
    const url = portalSession.url;

    return NextResponse.json({ url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

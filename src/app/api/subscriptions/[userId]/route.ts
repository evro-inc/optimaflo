import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';

import { stripe } from '@/src/lib/stripe';
import Joi from 'joi';

// Get a subscription by ID
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      userId: string;
    };
  }
) {
  try {
    // Extract the subscription ID from the request parameters
    const { userId } = params;

    // Define a Joi schema for the ID
    const schema = Joi.string().required();

    // Validate the ID with the schema
    const { error } = schema.validate(userId);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Query the database to retrieve the subscription
    const response = await prisma.subscription.findMany({
      where: { userId: userId },
      include: {
        Invoice: true,
        Product: true,
        Price: {
          include: {
            Product: true,
          },
        },
        User: {
          include: {
            Customer: true, // Include the associated Customer through the User
          },
        },
      },
    });

    if (response.length === 0) {
      // If the subscription is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      userId: string;
    };
  }
) {
  try {
    // Extract the subscription ID from the request parameters
    const { userId } = params;

    // Define a Joi schema for the ID
    const schema = Joi.string().required();

    // Validate the ID with the schema
    const { error } = schema.validate(userId);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Parse the request body
    const body = await req.json();

    // Update the subscription in the database
    const response = await prisma.subscription.update({
      where: { userId: userId },
      data: body,
    });

    // Update the subscription in Stripe
    await stripe.subscriptions.update(userId, body);

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

// Cancel the subscription
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      userId: string;
    };
  }
) {
  try {
    // Extract the subscription ID from the request parameters
    const { userId } = params;

    // Define a Joi schema for the ID
    const schema = Joi.string().required();

    // Validate the ID with the schema
    const { error } = schema.validate(userId);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Cancel the subscription in the database
    const response = await prisma.subscription.update({
      where: { userId: userId },
      data: { status: 'canceled' },
    });

    // Cancel the subscription in Stripe
    await stripe.subscriptions.del(userId);

    // Return the canceled subscription as JSON

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

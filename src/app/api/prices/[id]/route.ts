import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';

// GET a specific price
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  try {
    // Define a Joi schema for the price ID
    const schema = Joi.string()
      .pattern(new RegExp('^price_[A-Za-z0-9]{14}$'))
      .required();

    // Validate the price ID against the schema
    const { error } = schema.validate(params.id);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Retrieve the price from the database
    const price = await prisma.price.findUnique({
      where: { id: params.id },
      include: { Product: true }, // Include related Product records in the response
    });

    if (!price) {
      // If the price is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Price not found' }, { status: 404 });
    }

    return NextResponse.json(price, {
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

// PATCH a specific price
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  try {
    const id = params.id;
    const json = await request.json();

    // Define a Joi schema for the incoming data
    const schema = Joi.object({
      unitAmount: Joi.number().integer().optional(),
      currency: Joi.string().optional(),
      type: Joi.string().valid('one_time', 'recurring').optional(),
      interval: Joi.string().valid('day', 'week', 'month', 'year').optional(),
      intervalCount: Joi.number().integer().optional(),
      recurringInterval: Joi.string().optional(),
      recurringIntervalCount: Joi.number().integer().optional(),
      trialPeriodDays: Joi.number().integer().optional(),
    });

    // Validate the incoming data against the schema
    const { error } = schema.validate(json);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Update the price in the database
    const updated = await prisma.price.update({
      where: { id },
      data: json,
    });

    return NextResponse.json(updated, {
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

// DELETE a specific price
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  try {
    const id = params.id;

    // Delete the price in the database
    const deleted = await prisma.price.delete({
      where: { id },
    });

    return NextResponse.json(deleted, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error: any) {
    // If the price is not found in the database, return a 404 Not Found response
    if (
      error instanceof prisma.PrismaClientKnownRequestError &&
      error.code === 'P2016'
    ) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 });
    }

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: { id: string };
  }
) {
  try {
    // Define a Joi schema for the customer ID
    const schema = Joi.string().required();

    // Validate the customer ID against the schema
    const { error } = schema.validate(params.id);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Retrieve the customer from the database
    const customer = await prisma.Customer.findUnique({
      where: { id: params.id },
    });

    if (!customer) {
      // If the customer is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer, {
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

// Update a customer
export async function PATCH(
  request: Request,
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

    // Validate the incoming data
    const schema = Joi.object({
      stripeCustomerId: Joi.string().optional(),
      userId: Joi.string().optional(),
    });

    const { error } = schema.validate(json);

    if (error) {
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Update the customer in your database
    const updated = await prisma.Customer.update({
      where: { id },
      data: json,
    });

    return NextResponse.json(updated);
  } catch (error) {
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

// Delete a customer
export async function DELETE(
  request: Request,
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

    // Delete the customer in your database
    const deleted = await prisma.Customer.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

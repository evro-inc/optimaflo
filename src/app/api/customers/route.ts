import logger from '@/src/lib/logger';
import prisma from '@/src/lib/prisma';
import { stripe } from '@/src/lib/stripe';
import Joi from 'joi';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Extract query parameters from the URL
    const pageNumber = Number(req.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
    const sort = req.nextUrl.searchParams.get('sort') || 'id';
    const order = req.nextUrl.searchParams.get('order') || 'asc';

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, sort, order };

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id', 'stripeCustomerId').required(),
      order: Joi.string().valid('asc', 'desc').required(),
    });

    // Validate the params object with the schema
    const { error } = schema.validate(params);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Calculate the number of items to skip in the database query
    const skip = (pageNumber - 1) * limit;

    // Query the database to retrieve customers
    const customers = await prisma.customer.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
      include: {
        User: true,
      },
    });

    // Get total number of customers
    const total = await prisma.customer.count();

    // Create the response object
    const response = {
      data: customers,
      meta: {
        total,
        pageNumber,
        totalPages: Math.ceil(total / limit),
        pageSize: limit,
      },
      errors: null,
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

// app/customer/create/route.ts
export async function POST(request: NextRequest) {
  try {
    const { id, email } = await request.json();

    // Define a Joi schema for validation
    const schema = Joi.object({
      id: Joi.string().required(),
      email: Joi.string().email().required(),
    });

    // Validate the incoming data
    const { error } = schema.validate({ id, email });

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    const user = await prisma.User.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newCustomer = await stripe.customers.create({ email });
    const customer = await prisma.Customer.create({
      data: {
        stripeCustomerId: newCustomer.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ stripeCustomerId: customer.stripeCustomerId });
  } catch (err: any) {
    console.error('Failed to create customer:', err);

    // Return a 500 Internal Server Error response if something goes wrong.
    return NextResponse.json(
      {
        error: err,
      },
      { status: 500 }
    );
  }
}

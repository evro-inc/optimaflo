import prisma from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import logger from '@/src/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Extract query parameters from the URL
    const pageNumber = Number(req.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
    const status = req.nextUrl.searchParams.get('status') || null;
    const sort = req.nextUrl.searchParams.get('sort') || 'id';
    const order = req.nextUrl.searchParams.get('order') || 'asc';

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, status, sort, order };

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      status: Joi.string()
        .valid(
          'trialing',
          'active',
          'canceled',
          'incomplete',
          'incomplete_expired',
          'past_due',
          'unpaid',
          'paused'
        )
        .allow(null, ''),
      sort: Joi.string().valid('id', 'status', 'created').required(),
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

    // Query the database to retrieve subscriptions
    const subscriptions = await prisma.subscription.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
      where: status ? { status: status } : {},
      include: {
        User: true,
        Price: true,
        Product: true,
      },
    });

    // Get total number of subscriptions matching the criteria
    const total = await prisma.subscription.count({
      where: status ? { status: status } : {},
    });

    // Create the response object
    const response = {
      data: subscriptions,
      meta: {
        total,
        pageNumber,
        totalPages: Math.ceil(total / limit),
        pageSize: limit,
      },
      errors: null,
    };

    // Return the response as JSON

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

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();

    // Define a Joi schema for the request body
    const schema = Joi.object({
      userId: Joi.string().required(),
      status: Joi.string()
        .valid(
          'trialing',
          'active',
          'canceled',
          'incomplete',
          'incomplete_expired',
          'past_due',
          'unpaid',
          'paused'
        )
        .required(),
      priceId: Joi.string().required(),
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      cancelAtPeriodEnd: Joi.boolean().required(),
      created: Joi.date().required(),
      currentPeriodStart: Joi.date().required(),
      currentPeriodEnd: Joi.date().required(),
    });

    // Validate the request body with the schema
    const { error } = schema.validate(body);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Create a new subscription in the database
    const response = await prisma.subscription.create({
      data: body,
    });

    // Return the created subscription as JSON

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

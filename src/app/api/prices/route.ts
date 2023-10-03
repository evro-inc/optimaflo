export const dynamic = 'force-dynamic';
import prisma from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import logger from '@/src/lib/logger';

// GET all prices
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters from the URL
    const pageNumber = Number(request.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 10;
    const sort = request.nextUrl.searchParams.get('sort') || 'id';
    const order = request.nextUrl.searchParams.get('order') || 'asc';

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, sort, order };

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id', 'unitAmount', 'currency').required(),
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

    // Query the database to retrieve prices
    const prices = await prisma.price.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
    });

    // Get total number of prices
    const total = await prisma.price.count();

    // Create the response object
    const response = {
      data: prices,
      meta: {
        total,
        pageNumber,
        totalPages: Math.ceil(total / limit),
        pageSize: limit,
      },
      errors: null,
    };

    // Return the response as JSON
    const jsonString = JSON.stringify(response, null, 2);

    logger.debug('DEBUG RESPONSE: ', jsonString);

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

// POST a new price
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();

    // Define a Joi schema for the price data
    const schema = Joi.object({
      productId: Joi.string().required(),
      active: Joi.boolean().required(),
      description: Joi.string().optional(),
      unitAmount: Joi.number().integer().required(),
      currency: Joi.string().required(),
      type: Joi.string().valid('one_time', 'recurring').required(),
      interval: Joi.string()
        .valid('day', 'week', 'month', 'year')
        .when('type', {
          is: 'recurring',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
      intervalCount: Joi.number().integer().when('type', {
        is: 'recurring',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      trialPeriodDays: Joi.number().integer().optional(),
      metadata: Joi.object().optional(),
    });

    // Validate the incoming data against the schema
    const { error } = schema.validate(json);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Create the price in your database
    const created = await prisma.price.create({
      data: json,
    });

    return NextResponse.json(created);
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.error();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import logger from '@/src/lib/logger';

export async function GET(req: NextRequest) {
  try {
    // Extract query parameters from the URL
    const pageNumber = Number(req.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
    const sort = req.nextUrl.searchParams.get('sort') || 'id';
    const order = req.nextUrl.searchParams.get('order') || 'asc';
    const active = req.nextUrl.searchParams.get('active') || null;

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, sort, order, active };

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      sort: Joi.string().valid('id', 'name', 'active').required(),
      order: Joi.string().valid('asc', 'desc').required(),
      active: Joi.boolean().allow(null),
    });

    // Validate the params object with the schema
    const { error } = schema.validate(params);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Calculate the number of items to skip in the database query
    const skip = (pageNumber - 1) * limit;

    // Query the database to retrieve products
    const products = await prisma.product.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
      where: active !== null ? { active: active === 'true' } : {},
      include: {
        Price: true,
      },
    });

    // Get total number of products matching the criteria
    const total = await prisma.product.count({
      where: active !== null ? { active: active === 'true' } : {},
    });

    // Create the response object
    const response = {
      data: products,
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

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body of the request
    const json = await request.json();

    // Define a Joi schema for the product data
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow(null, ''),
      image: Joi.string().uri().allow(null, ''),
      active: Joi.boolean().required(),
    });

    // Validate the product data against the schema
    const { error } = schema.validate(json);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Create the product in the database
    const response = await prisma.product.create({
      data: json,
    });

    // Return the created product as JSON

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

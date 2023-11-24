import prisma from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import Joi from 'joi';
import logger from '@/src/lib/logger';

// This function handles an HTTP GET request
export async function GET(req: NextRequest) {
  try {
    // Extract query parameters from the URL
    const pageNumber = Number(req.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
    const role = req.nextUrl.searchParams.get('role') || null;
    const sort = req.nextUrl.searchParams.get('sort') || 'id';
    const order = req.nextUrl.searchParams.get('order') || 'asc';

    // Create a JavaScript object with the extracted parameters
    const params = { pageNumber, limit, role, sort, order };

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      role: Joi.string().valid('ADMIN', 'USER', 'GUEST').allow(null, ''),
      sort: Joi.string().valid('id', 'name', 'email').required(),
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

    // Query the database to retrieve users
    const users = await prisma.user.findMany({
      skip: skip,
      take: limit,
      orderBy: {
        [sort]: order,
      },
      where: role ? { role: role } : {},
      include: {
        Customer: true,
        Subscription: true,
      },
    });

    // Get total number of users matching the criteria
    const total = await prisma.user.count({
      where: role ? { role: role } : {},
    });

    // Create the response object
    const response = {
      data: users,
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

// This function handles an HTTP POST request
export async function POST(request: Request) {
  try {
    const json = await request.json();

    // Define a Joi schema
    const schema = Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      role: Joi.string().valid('ADMIN', 'USER', 'GUEST').required(),
    });

    // Validate the request body with the schema
    const { error } = schema.validate(json);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Create a new user in the database
    const response = await prisma.user.create({
      data: json,
    });

    // Return the created user as JSON with status code 201 (Created)
    

    

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

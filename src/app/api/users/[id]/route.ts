import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';
import logger from '@/src/lib/logger';

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
    // Extract query parameters from the request URL
    const pageNumber = Number(req.nextUrl.searchParams.get('page')) || 1;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;
    const role = req.nextUrl.searchParams.get('role') || null;

    // Define a Joi schema
    const schema = Joi.object({
      pageNumber: Joi.number().integer().min(1).required(),
      limit: Joi.number().integer().min(1).max(100).required(),
      role: Joi.string().valid('ADMIN', 'USER', 'GUEST').allow(null, ''),
    });

    const paramValidate = { pageNumber, limit, role };

    // Validate the params object with the schema
    const { error } = schema.validate(paramValidate);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    const id = params.id;
    const user = await prisma.User.findUnique({
      where: {
        id: id,
      },
      include: {
        Customer: true,
        Subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = {
      data: user,
      meta: {
        null: null,
      },
      errors: null,
    };

    console.log('DEBUG RESPONSE: ', response);

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

// NOT TESTED YET

export async function PUT(
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
    // Extract the user ID from the parameters
    const id = params.id;

    // Parse the request body
    const body = await req.json();

    // Define a Joi schema for the request body
    const schema = Joi.object({
      stripeCustomerId: Joi.string().allow(null, ''),
      subscriptionId: Joi.string().allow(null, ''),
      subscriptionStatus: Joi.string().allow(null, ''),
      name: Joi.string().allow(null, ''),
      email: Joi.string().email().allow(null, ''),
      emailVerified: Joi.date().timestamp().allow(null, ''),
      image: Joi.string().uri().allow(null, ''),
      role: Joi.string().valid('ADMIN', 'USER'),
    });

    // Validate the request body with the schema
    const { error } = schema.validate(body);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: body,
    });

    // Return the updated user
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

//Update partial resource
export async function PATCH(
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
    // Extract the user ID from the parameters
    const id = params.id;

    // Parse the request body
    const body = await req.json();

    // Define a Joi schema for the request body
    const schema = Joi.object({
      stripeCustomerId: Joi.string().allow(null, ''),
      subscriptionId: Joi.string().allow(null, ''),
      subscriptionStatus: Joi.string().allow(null, ''),
      name: Joi.string().allow(null, ''),
      email: Joi.string().email().allow(null, ''),
      emailVerified: Joi.date().timestamp().allow(null, ''),
      image: Joi.string().uri().allow(null, ''),
      role: Joi.string().valid('ADMIN', 'USER'),
    }).unknown(true); // Allow unknown fields

    // Validate the request body with the schema
    const { error } = schema.validate(body);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: body,
    });

    // Return the updated user
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
//Delete resource
export async function DELETE(
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
    // Extract the user ID from the parameters
    const id = params.id;

    // Check if the user exists in the database
    const user = await prisma.User.findUnique({
      where: {
        id: id,
      },
    });

    if (!user) {
      // If the user does not exist, return a 404 Not Found response
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user from the database
    const deletedUser = await prisma.User.delete({
      where: { id: id },
    });

    // Return the deleted user
    return NextResponse.json(deletedUser);
  } catch (error) {
    console.error('Error: ', error);

    // Return a 500 status code for internal server error
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

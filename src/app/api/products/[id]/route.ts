import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/src/lib/prisma';
import Joi from 'joi';

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
    // Define a Joi schema for the product ID
    const schema = Joi.string()
      .pattern(new RegExp('^prod_[A-Za-z0-9]{14}$'))
      .required();

    // Validate the product ID against the schema
    const { error } = schema.validate(params.id);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Retrieve the product from the database
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { Price: true }, // Include related Price records in the response
    });

    if (!product) {
      // If the product is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    // Create the response object
    const response = {
      data: product,
      meta: {
        null: null,
      },
      errors: null,
    };

    // Return the product as JSON

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

// Update a product
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

    // Define a Joi schema for the product data
    const schema = Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().optional(),
      image: Joi.string().optional(),
      active: Joi.boolean().optional(),
    });

    // Validate the product data against the schema
    const { error } = schema.validate(json);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Retrieve the product from the database
    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      // If the product is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update the product in the database
    const response = await prisma.product.update({
      where: { id: id },
      data: json,
    });

    // Return the updated product as JSON

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

// Delete a product
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

    // Define a Joi schema for the product ID
    const schema = Joi.string()
      .pattern(new RegExp('^prod_[A-Za-z0-9]{14}$'))
      .required();

    // Validate the product ID against the schema
    const { error } = schema.validate(id);

    if (error) {
      // If validation fails, return a 400 Bad Request response
      return NextResponse.json({ error: error }, { status: 400 });
    }

    // Retrieve the product from the database
    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      // If the product is not found, return a 404 Not Found response
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the product in the database
    const response = await prisma.product.delete({
      where: { id: id },
    });

    // Return the deleted product as JSON

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

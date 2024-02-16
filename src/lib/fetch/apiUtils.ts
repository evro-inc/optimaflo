import { NextResponse } from 'next/server';
import prisma from '../prisma';

// Utility to validate schema
export const validateSchema = (schema, data) => {
  const { error } = schema.validate(data);
  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
};

// Utility to get access token
export const getAccessToken = async (userId) => {
  const user = await prisma.account.findFirst({
    where: { userId },
  });
  if (!user?.access_token) {
    // If the access token is null or undefined, return an error response
    return new NextResponse(JSON.stringify({ message: 'Access token is missing' }), {
      status: 401,
    });
  }
  return user.access_token;
};

// Centralized error handling
export const handleError = (error) => {
  if (error.message === 'Access token is missing') {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
  // Add more conditions as needed
  return NextResponse.error();
};

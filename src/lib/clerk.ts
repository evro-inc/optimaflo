'use server';

import { createClerkClient } from '@clerk/nextjs/server'

export const currentUserOauthAccessToken = async (userId: string) => {
  try {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

    const { data } = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');

    const accessToken = data[0].token;

    return accessToken;
  } catch (error: any) {
    throw new Error(error);
  }
};

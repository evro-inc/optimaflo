import { clerkClient } from '@clerk/nextjs/server';

export const currentUserOauthAccessToken = async (userId: string) => {
  try {
    const clerkResponse = await clerkClient().users.getUserOauthAccessToken(userId, 'oauth_google');

    const accessToken = clerkResponse.data[0].token;

    return accessToken;
  } catch (error: any) {
    throw new Error(error);
  }
};

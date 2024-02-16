import { clerkClient } from '@clerk/nextjs';

export const currentUserOauthAccessToken = async (userId: string) => {
  try {
    const accessToken = await clerkClient.users.getUserOauthAccessToken(userId, 'oauth_google');
    return accessToken;
  } catch (error: any) {
    throw new Error(error);
  }
};

import { clerkClient } from '@clerk/nextjs';

export const currentUserOauthAccessToken = async (userId: string) => {
  const accessToken = await clerkClient.users.getUserOauthAccessToken(
    userId,
    'oauth_google'
  );
  return accessToken;
};

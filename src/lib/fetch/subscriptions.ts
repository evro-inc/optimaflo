'use server';

import prisma from '../prisma';

// Get subscriptions. This function is used in the middleware file and calls the API because Prisma functions can not be run in the middleware file.
export async function getSubscriptionsAPI(userId: string, authToken: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const userApi = `${baseUrl}/api/users/${userId}`;

  const options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`, // Use 'Bearer ' prefix for the token
    },
  };

  try {
    const userResponse = await fetch(userApi, options);

    if (!userResponse.ok) {
      const responseText = await userResponse.text();
      console.error(`Error fetching user: ${userResponse.status} ${userResponse.statusText}. Response: ${responseText}`);

      if (userResponse.status === 401 || userResponse.status === 403) {
        throw new Error('Unauthorized: Token may be invalid or expired');
      }

      if (userResponse.status === 404) {
        throw new Error('User not found. Make sure the userId is correct.');
      }

      throw new Error(`Error: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userText = await userResponse.json();
    const userSubscriptions = userText.data.Subscription;

    if (!userSubscriptions) {
      throw new Error('User has no subscriptions');
    }

    return userSubscriptions;
  } catch (error) {
    console.error('Error in getSubscriptionsAPI:', error);
    throw error;
  }
}


// This function is used in the profile page to get the subscription details.
export async function getSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
    },
    include: {
      Invoice: true,
      User: true,
      Product: true,
    },
  });
  return subscription;
}

import prisma from '../prisma';

// Get subscriptions. This function is used in the middleware file and calls the API because Prisma functions can not be run in the middleware file.
export async function getSubscriptionsAPI(userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const userApi = `${baseUrl}/api/users/${userId}`;

  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const user = await fetch(userApi, options);

    if (!user.ok) {
      const responseText = await user.text();
      throw new Error(`Error: ${user.status} ${user.statusText}. Response: ${responseText}`);
    }

    const userText = await user.json();
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

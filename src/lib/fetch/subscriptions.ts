import { getURL } from '../helpers';
import prisma from '../prisma';

// get subscriptions
export async function getSubscriptions(userId: string) {
  const userApi = `${getURL()}/api/users/${userId}`;

  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const user = await fetch(userApi, options);

  if (!user.ok) {
    const responseText = await user.text();
    throw new Error(
      `Error: ${user.status} ${user.statusText}. Response: ${responseText}`
    );
  }

  const userText = await user.json();
  const userSubscriptions = userText.data.Subscription;

  return userSubscriptions;
}

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

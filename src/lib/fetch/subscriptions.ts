import { getURL } from '../helpers';

// get subscriptions
export async function getSubscriptions(userId: string) {
  const userApi = `${getURL()}api/users/${userId}`;

  console.log(`userApi: ${userApi}`);
  

  const options = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const user = await fetch(userApi, options);
  
  console.log(`user: ${JSON.stringify(user)}`);
  

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

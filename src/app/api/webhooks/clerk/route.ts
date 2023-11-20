import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/src/lib/prisma';

export async function handler(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET as string;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const eventType = evt.type;

  // Handle the event
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const clerkUser = evt.data; // Clerk user data

    await prisma.User.upsert({
      where: { id: clerkUser.id },
      update: {
        email: clerkUser.email_addresses[0]?.email_address,
        name: clerkUser.first_name + ' ' + clerkUser.last_name,
        image: clerkUser.image_url,
        // Add other fields as needed
      },
      create: {
        id: clerkUser.id,
        stripeCustomerId: null, // or appropriate initial value
        subscriptionId: null, // or appropriate initial value
        name: clerkUser.first_name + ' ' + clerkUser.last_name,
        email: clerkUser.email_addresses[0]?.email_address,
        image: clerkUser.image_url,
        // Add other fields as needed
      },
    });
  }

  if (eventType === 'user.deleted') {
    const clerkUser = evt.data; // Clerk user data

    await prisma.User.delete({
      where: { id: clerkUser.id },
    });
  }

  /* clerkSession verification:  {
  abandon_at: 1703016814568,
  actor: null,
  client_id: 'client_2YPOybYuAIguk8PEPG4DAvTwVVw',
  created_at: 1700424814568,
  expire_at: 1701029614568,
  id: 'sess_2YPQcYM5IeVphfoMZkrnPpYuIU2',
  last_active_at: 1700424814568,
  object: 'session',
  status: 'active',
  updated_at: 1700424814568,
  user_id: 'user_2YPQccXRBHSwPf982gORmrVl3m2'
} */

  if (
    eventType === 'session.created' ||
    eventType === 'session.ended' ||
    eventType === 'session.removed' ||
    eventType === 'session.revoked'
  ) {
    const clerkSession = evt.data; // Clerk session data

    await prisma.Session.upsert({
      where: { id: clerkSession.id },
      update: {
        abandonAt: clerkSession.abandon_at,
        clientId: clerkSession.client_id,
        createdAt: clerkSession.created_at,
        expireAt: clerkSession.expire_at,
        lastActiveAt: clerkSession.last_active_at,
        status: clerkSession.status,
        updatedAt: clerkSession.updated_at,
        userId: clerkSession.user_id,
      },
      create: {
        id: clerkSession.id,
        abandonAt: clerkSession.abandon_at,
        clientId: clerkSession.client_id,
        createdAt: clerkSession.created_at,
        expireAt: clerkSession.expire_at,
        lastActiveAt: clerkSession.last_active_at,
        status: clerkSession.status,
        updatedAt: clerkSession.updated_at,
        userId: clerkSession.user_id,
      },
    });
  }

  return new Response('', { status: 200 });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;

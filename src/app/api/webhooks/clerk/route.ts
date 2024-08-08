import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/src/lib/prisma';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET as string;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
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
    return new Response('Error occurred', {
      status: 400,
    });
  }

  const eventType = evt.type;
  console.log('Webhook event verified:', evt);

  // Helper function to fetch or create user from Clerk
  async function fetchOrCreateUser(clerkUserId: string) {
    try {
      const clerkUserData = await clerkClient().users.getUser(clerkUserId);

      // Check if user already exists by email
      const existingUserByEmail = await prisma.User.findUnique({
        where: { email: clerkUserData.emailAddresses[0]?.emailAddress },
      });

      if (existingUserByEmail) {
        // Update the existing user
        return await prisma.User.update({
          where: { email: clerkUserData.emailAddresses[0]?.emailAddress },
          data: {
            id: clerkUserData.id,
            name: `${clerkUserData.firstName} ${clerkUserData.lastName}`,
            image: clerkUserData.imageUrl,
          },
        });
      }

      // If no existing user by email, upsert by ID
      return await prisma.User.upsert({
        where: { id: clerkUserData.id },
        update: {
          email: clerkUserData.emailAddresses[0]?.emailAddress,
          name: `${clerkUserData.firstName} ${clerkUserData.lastName}`,
          image: clerkUserData.imageUrl,
        },
        create: {
          id: clerkUserData.id,
          stripeCustomerId: null,
          subscriptionId: null,
          name: `${clerkUserData.firstName} ${clerkUserData.lastName}`,
          email: clerkUserData.emailAddresses[0]?.emailAddress,
          image: clerkUserData.imageUrl,
        },
      });
    } catch (error) {
      console.error(`Error fetching user from Clerk: ${error.message}`);
      return null;
    }
  }

  // Handle the event with a switch statement
  switch (eventType) {
    // USER EVENTS
    case 'user.created':
    case 'user.updated': {
      const clerkUser = evt.data;

      await fetchOrCreateUser(clerkUser.id);
      break;
    }
    case 'user.deleted': {
      const clerkUser = evt.data;

      const existingUser = await prisma.User.findUnique({
        where: { id: clerkUser.id },
      });

      if (existingUser) {
        await prisma.User.delete({
          where: { id: clerkUser.id },
        });
      }
      break;
    }

    // SESSION EVENTS
    case 'session.created':
    case 'session.ended':
    case 'session.removed':
    case 'session.revoked': {
      const clerkSession = evt.data;

      // Ensure user exists before upserting session
      let existingUser = await prisma.User.findUnique({
        where: { id: clerkSession.user_id },
      });

      if (!existingUser) {
        existingUser = await fetchOrCreateUser(clerkSession.user_id);
      }

      if (existingUser) {
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
      } else {
        console.error(`Failed to create session for non-existent user ID: ${clerkSession.user_id}`);
      }
      break;
    }
    default:
      throw new Error('Unhandled event type: ' + eventType);
  }

  return new Response('', { status: 200 });
}

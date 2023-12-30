import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
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

  // Handle the event with a switch statement
  switch (eventType) {
    // USER EVENTS
    case 'user.created':
    case 'user.updated': {
      const clerkUser = evt.data; // Clerk user data

      await prisma.User.upsert({
        where: { id: clerkUser.id },
        update: {
          email: clerkUser.email_addresses[0]?.email_address,
          name: clerkUser.first_name + ' ' + clerkUser.last_name,
          image: clerkUser.image_url,
        },
        create: {
          id: clerkUser.id,
          stripeCustomerId: null, // or appropriate initial value
          subscriptionId: null, // or appropriate initial value
          name: clerkUser.first_name + ' ' + clerkUser.last_name,
          email: clerkUser.email_addresses[0]?.email_address,
          image: clerkUser.image_url,
        },
      });
      break;
    }
    case 'user.deleted':
      {
        const clerkUser = evt.data; // Clerk user data

        // Check if the user exists in the database
        const existingUser = await prisma.User.findUnique({
          where: { id: clerkUser.id },
        });

        // Only delete the user if they exist in the database
        if (existingUser) {
          await prisma.User.delete({
            where: { id: clerkUser.id },
          });
        }
      }
      break;

    // SESSION EVENTS
    case 'session.created':
    case 'session.ended':
    case 'session.removed':
    case 'session.revoked':
      {
        const clerkSession = evt.data; // Clerk session data

        // Check if user exists
        const existingUser = await prisma.User.findUnique({
          where: { id: clerkSession.id },
        });

        // If the user does not exist, you might create it here or handle the error
        if (!existingUser) {
          const clerkUserData = await clerkClient.users.getUser(
            clerkSession.user_id
          );
          await prisma.User.upsert({
            where: { email: clerkUserData.emailAddresses[0]?.emailAddress },
            update: {
              email: clerkUserData.emailAddresses[0]?.emailAddress,
              name: clerkUserData.firstName + ' ' + clerkUserData.lastName,
              image: clerkUserData.imageUrl,
              // Add other fields as needed
            },
            create: {
              id: clerkUserData.id,
              stripeCustomerId: null, // or appropriate initial value
              subscriptionId: null, // or appropriate initial value
              name: clerkUserData.firstName + ' ' + clerkUserData.lastName,
              email: clerkUserData.emailAddresses[0]?.emailAddress,
              image: clerkUserData.imageUrl,
              // Add other fields as needed
            },
          });
        }

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
      break;
    default:
      console.log('Unknown event type');
  }

  return new Response('', { status: 200 });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;

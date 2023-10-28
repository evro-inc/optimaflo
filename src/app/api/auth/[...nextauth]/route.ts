import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/src/lib/prisma';
import logger from '@/src/lib/logger';

const scopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.delete.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish',
  'https://www.googleapis.com/auth/tagmanager.manage.users',
  'https://www.googleapis.com/auth/tagmanager.manage.accounts',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit',
  'openid',
  'profile',
  'email',
];

let authOptions: NextAuthOptions;
let handler;

try {
  authOptions = {
    session: {
      strategy: 'database',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      updateAge: 24 * 60 * 60, // 24 hour
    },
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            response_type: 'code',
            scope: scopes.join(' '),
          },
        },
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            role: profile.role,
          };
        },
      }),
    ],
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      session: async ({ session, user }) => {
        const [google] = await prisma.account.findMany({
          where: { userId: user.id, provider: 'google' },
        });

        const bufferTime = 5 * 60 * 1000;

        if (google.expires_at * 1000 - bufferTime < Date.now()) {
          try {
            const response = await fetch(
              'https://oauth2.googleapis.com/token',
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  client_id: process.env.GOOGLE_CLIENT_ID ?? '',
                  client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
                  grant_type: 'refresh_token',
                  refresh_token: google.refresh_token,
                }),
                method: 'POST',
              }
            );

            if (!response.ok) {
              const responseBody = await response.text(); // or response.json() if the response is a JSON
              logger.error('Error refreshing access token:', responseBody);
              throw new Error('Failed to refresh access token');
            }

            const tokens = await response.json();

            if (!response.ok) throw tokens;

            await prisma.account.update({
              data: {
                access_token: tokens.access_token,
                expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
                refresh_token: tokens.refresh_token ?? google.refresh_token,
              },
              where: {
                provider_providerAccountId: {
                  provider: 'google',
                  providerAccountId: google.providerAccountId,
                },
              },
            });
            logger.info('google token refreshed: ');
          } catch (error) {
            logger.error('Error refreshing Google token:', error);
          }
        }

        if (user) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
          });
          user.role = dbUser?.role;
        }

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            role: user.role,
          },
          accessToken: google ? google.access_token : null,
        };
      },
    },
  };
  handler = NextAuth(authOptions);
} catch (error) {
  logger.error('Error setting up auth options', error);
}

export { authOptions };
export { handler as GET, handler as POST };

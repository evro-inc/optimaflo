import { NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import { listGtmAccounts } from '@/src/lib/fetch/dashboard/gtm/actions/accounts';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { redis } from '@/src/lib/redis/cache';

// Refactored GET handler
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();

    const cachedValue = await redis.get(`user:${userId}-gtm:accounts`);

    if (cachedValue) {
      return NextResponse.json(JSON.parse(cachedValue), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const token = await currentUserOauthAccessToken(userId);
    const response = await listGtmAccounts(token[0].token);

    redis.set(
      `gtm:accounts-userId:${userId}`,
      JSON.stringify(response),
      'EX',
      60 * 60 * 24 * 7
    );

    return NextResponse.json(response, {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      console.error('Validation Error: ', error.message);
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: 400,
      });
    }

    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

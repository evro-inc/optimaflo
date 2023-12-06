import { NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import { listGtmAccounts } from '@/src/lib/actions/accounts';
import { currentUserOauthAccessToken } from '@/src/lib/clerk';
import { auth } from '@clerk/nextjs';
import { notFound } from 'next/navigation';

// Refactored GET handler
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return notFound();
    const token = await currentUserOauthAccessToken(userId);
    const response = await listGtmAccounts(token[0].token);

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

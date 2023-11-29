import { NextResponse } from 'next/server';
import { ValidationError } from '@/src/lib/exceptions';
import { auth, clerkClient } from '@clerk/nextjs';
import { notFound } from 'next/navigation';
import { listGtmAccounts } from '@/src/lib/actions/accounts';



// Refactored GET handler
export async function GET() {
  const { userId }: { userId: string | null; getToken: any } = auth();

  if (!userId) return notFound();

  try {
    const accessToken = await clerkClient.users.getUserOauthAccessToken(
      userId,
      'oauth_google'
    );

    if (!accessToken) {
      // Handle the case where accessToken is null
      // e.g., return an error response or prompt re-authentication
      return new NextResponse(
        JSON.stringify({ error: 'Access token not found' }),
        {
          status: 401, // Unauthorized
        }
      );
    }

    const response = await listGtmAccounts(userId, accessToken[0].token);

    return NextResponse.json(response, {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });;
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

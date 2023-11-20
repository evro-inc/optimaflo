import { NextResponse } from 'next/server';
import { useSession } from '@clerk/nextjs';

export async function GET() {
  const { session } = useSession();

  if (!session) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
    });
  }

  return NextResponse.json({ authenticated: !!session });
}

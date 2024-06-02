import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/src/lib/prisma';
import { listGaAccounts } from '@/src/lib/fetch/dashboard/actions/ga/accounts';

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.redirect('/login');

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code in query parameters' }, { status: 400 });
  }

  try {
    const accounts = await listGaAccounts(true);

    if (!accounts.data.items || !accounts.data.items.some((account) => account.id === code)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await prisma.ga.updateMany({
      where: { id: code },
      data: { status: 'ToS_Signed' },
    });

    return NextResponse.json({ message: 'ToS signed successfully' });
  } catch (error) {
    console.error('Error updating account status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

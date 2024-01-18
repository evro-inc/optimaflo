import { NextRequest, NextResponse } from 'next/server';

import { revalidatePath } from 'next/cache';

export async function GET(req: NextRequest) {
  const path: any = req.nextUrl.searchParams.get('path');
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, now: Date.now() });
}

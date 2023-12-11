import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/src/lib/redis/cache';

import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  const body = JSON.parse(await req.text());
  const { key } = body;
  const path = req.nextUrl.searchParams.get('path') || '/'; // should it fall back on the layout?
  redis.del(key);
  revalidatePath(path);

  return NextResponse.json({ success: true }, { status: 200 });
}

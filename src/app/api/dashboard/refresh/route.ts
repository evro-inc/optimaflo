import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/src/lib/redis/cache';

import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  const body = JSON.parse(await req.text());
  const { path } = body;

  for (const key of await redis.keys('*')) {
      redis.del(key);
      revalidatePath(path);
  }
  
  return NextResponse.json({ revalidated: true, now: Date.now() });
}

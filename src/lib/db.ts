import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
if (process.env.VERCEL_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prisma = global.cachedPrisma;
}

export const db = prisma;

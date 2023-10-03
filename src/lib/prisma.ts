import { PrismaClient } from '@prisma/client';

// Declare a variable that will hold the instance of PrismaClient
let prisma;

if (process.env.VERCEL_ENV === 'production') {
  // In production, create a new instance for each request
  prisma = new PrismaClient();
} else {
  // In development, use a global instance to take advantage of
  // hot-reloading and prevent too many connections
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;

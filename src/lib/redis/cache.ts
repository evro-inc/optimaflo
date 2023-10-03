import { Redis } from 'ioredis';

const getRedisURL = () => {
  if (process.env.UPSTASH_REDIS_CACHE_URL) {
    return process.env.UPSTASH_REDIS_CACHE_URL;
  }
  throw new Error('Redis URL not found');
};

export const redis = new Redis(getRedisURL());

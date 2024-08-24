import { Redis } from 'ioredis';

const getRedisURL = () => {
  if (process.env.UPSTASH_REDIS_CACHE_URL) {
    return process.env.UPSTASH_REDIS_CACHE_URL;
  }
  throw new Error('Redis URL not found');
};

// Redis client initialization with enhanced options
export const redis = new Redis(getRedisURL(), {
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  lazyConnect: true,
  keepAlive: 10000, // 10 seconds
  retryStrategy: (times) => {
    const delay = Math.min(times * 500, 2000); // Exponential backoff, max 2 seconds
    return delay;
  },
  connectTimeout: 10000, // 10 seconds
  maxRetriesPerRequest: 3,
  tls: {
    rejectUnauthorized: false, // Add this line to handle self-signed certificates
  },
});

// Error handling and logging
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Implement any additional logic for handling errors, like notifications
});

// Retry logic for ECONNRESET errors
redis.on('end', () => {
  console.warn('Redis connection ended. Attempting to reconnect...');
  redis.connect().catch((err) => {
    console.error('Failed to reconnect to Redis:', err);
  });
});

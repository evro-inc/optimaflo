import { Redis } from 'ioredis';

const getRedisURL = () => {
  if (process.env.UPSTASH_REDIS_CACHE_URL) {
    return process.env.UPSTASH_REDIS_CACHE_URL;
  }
  throw new Error('Redis URL not found');
};

// Redis client initialization with enhanced options
export const redis = new Redis(getRedisURL(), {
  // Reconnect on connection errors
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect only if the error contains "READONLY"
      return true;
    }
    return false;
  },
  // Delays connection until the first command is issued
  lazyConnect: true,

  // Keep the connection alive
  keepAlive: 10000, // 10 seconds

  // Retry strategy for handling connection drops
  retryStrategy: (times) => {
    const delay = Math.min(times * 500, 2000); // Exponential backoff, max 2 seconds
    return delay;
  },

  // Increase timeout for connecting to Redis
  connectTimeout: 10000, // 10 seconds

  // Adjust the number of times to retry a command before giving up
  maxRetriesPerRequest: 3,

  // Enable TLS if required by Upstash (commonly for secured connections)
  tls: process.env.UPSTASH_REDIS_CACHE_TLS ? {} : undefined,
});

// Error handling and logging
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
  // Implement any additional logic for handling errors, like notifications
});

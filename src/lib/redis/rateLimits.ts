import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Connect to Redis
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

// Dashboard rate limit
export const dashboardRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, '1 s'),
});

// User rate limit
export const userRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
});

// Customer rate limit
export const customerRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
});

// Subscription rate limit
export const subscriptionRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
});

// Product rate limit
export const productRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5000, '1 h'),
});

// Price rate limit
export const priceRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5000, '1 h'),
});

// Checkout session rate limit
export const checkoutSessionRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
});

// Portal session rate limit
export const portalSessionRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
});

// Webhook rate limit
export const webhookRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5000, '1 h'),
});

// General API rate limit
export const generalApiRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10000, '1 h'),
});

// GTM rate limit
export const gtmRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10000, '1 d'), // 10,000 requests per day
});

export const gaRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(1200, '1 m'), // 1,200 requests per minute
  // Optionally, if tracking per user
  //userLimiter: Ratelimit.slidingWindow(600, '1 m') // 600 requests per minute per user
});

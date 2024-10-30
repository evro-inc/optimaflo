import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { getSubscriptionsAPI } from './lib/fetch/subscriptions';
import { NextResponse } from 'next/server';
import {
  checkoutSessionRateLimit,
  customerRateLimit,
  dashboardRateLimit,
  generalApiRateLimit,
  gtmRateLimit,
  portalSessionRateLimit,
  priceRateLimit,
  productRateLimit,
  subscriptionRateLimit,
  userRateLimit,
} from './lib/redis/rateLimits';

const isPublicRoute = createRouteMatcher([
  '/',
  '/blocked',
  '/about',
  '/features',
  '/pricing',
  '/contact',
  '/tos',
  '/privacy',
  '/api/contact',
  '/api/webhooks(.*)',
  '/api/resend',
]);

const nonSubscriptionRoutes = createRouteMatcher([
  '/api/users(.*)',
  '/api/subscriptions(.*)',
  '/api/customers(.*)',
  '/profile',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, getToken } = await auth();

  // Step 1: Handle Public Routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Step 2: Ensure User Authentication
  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Step 3: Protect Non-Subscription Routes
  if (!nonSubscriptionRoutes(req)) {
    await auth.protect();
  }

  const ip = req.ip ?? '127.0.0.1';

  // Step 4: Subscription and Rate Limit Checks
  try {
    // Check the user's subscriptions only if authenticated
    if (userId) {
      // Make sure to use the Clerk session token to authenticate the API request
      const authToken = await getToken();

      if (!authToken) {
        console.error('No auth token available for subscription check');
        return NextResponse.redirect(new URL('/blocked', req.url));
      }

      let subscriptions;
      try {
        subscriptions = await getSubscriptionsAPI(userId, authToken);
      } catch (subError) {
        return NextResponse.redirect(new URL('/pricing', req.url));
      }

      const hasActiveSubscription = subscriptions.some(
        (subscription) => subscription.status === 'active'
      );

      if (!hasActiveSubscription) {
        return NextResponse.redirect(new URL('/pricing', req.url));
      }

      // Rate Limit Check - General API
      const generalRateLimitResult = await generalApiRateLimit.limit(ip);
      if (!generalRateLimitResult.success) {
        return NextResponse.redirect(new URL('/blocked', req.url));
      }

      // Specific Rate Limit Checks
      const rateLimitRules = [
        {
          urlPattern: new RegExp('/dashboard($|/.*)'),
          rateLimit: dashboardRateLimit,
        },
        {
          urlPattern: new RegExp('/api/dashboard($|/.*)'),
          rateLimit: gtmRateLimit,
        },
        {
          urlPattern: new RegExp('/api/users($|/.*)'),
          rateLimit: userRateLimit,
        },
        {
          urlPattern: new RegExp('/api/customers($|/.*)'),
          rateLimit: customerRateLimit,
        },
        {
          urlPattern: new RegExp('/api/subscriptions($|/.*)'),
          rateLimit: subscriptionRateLimit,
        },
        {
          urlPattern: new RegExp('/api/products($|/.*)'),
          rateLimit: productRateLimit,
        },
        {
          urlPattern: new RegExp('/api/prices($|/.*)'),
          rateLimit: priceRateLimit,
        },
        {
          urlPattern: new RegExp('/api/create-checkout-session($|/.*)'),
          rateLimit: checkoutSessionRateLimit,
        },
        {
          urlPattern: new RegExp('/api/create-portal-link($|/.*)'),
          rateLimit: portalSessionRateLimit,
        },
      ];

      for (const rule of rateLimitRules) {
        if (rule.urlPattern.test(req.nextUrl.pathname)) {
          const rateLimitResult = await rule.rateLimit.limit(ip);
          if (!rateLimitResult.success) {
            return NextResponse.redirect(new URL('/blocked', req.url));
          }
        }
      }
    }
  } catch (error) {
    console.error('Error while checking subscriptions or rate limits:', error);
    return NextResponse.error();
  }

  // Continue with the request if all checks are passed
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

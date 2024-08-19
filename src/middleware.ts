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
  '/profile'
]);



export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth();

  const path = req.nextUrl.pathname;

  console.log('Current path:', path);
  console.log('Is non-subscription route:', nonSubscriptionRoutes(req));
  console.log('Is public route:', isPublicRoute(req));

  if (!isPublicRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (!isPublicRoute(req) && !nonSubscriptionRoutes(req)) {
    auth().protect();
    const ip = req.ip ?? '127.0.0.1';

    // Your subscription and rate limit checks here
    try {
      if (userId) {
        const subscriptions = await getSubscriptionsAPI(userId);

        console.log('subscription', subscriptions);

        const hasActiveSubscription = subscriptions
          .filter((subscription) => subscription.status === 'active')
          .map((subscription) => subscription.productId);

        // If the user doesn't have any active subscription, redirect to /blocked
        if (!hasActiveSubscription) {
          return NextResponse.redirect(new URL('/blocked', req.url));
        }


        // Rate limit check
        // Check the general API rate limit
        const generalRateLimitResult = await generalApiRateLimit.limit(ip);
        if (!generalRateLimitResult.success) {
          return NextResponse.redirect(new URL('/blocked', req.url));
        }

        // rate limit check
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

        // Check the rate limit for each rule - Comment out while testing
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
      console.error('Error while checking subscriptions:', error);

      return NextResponse.error();
    }
  }

  // Continue with the request if user is authorized and passes all checks
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

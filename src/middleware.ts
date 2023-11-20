import { authMiddleware, redirectToSignIn } from '@clerk/nextjs';
import { getSubscriptions } from './lib/fetch/subscriptions';
import logger from './lib/logger';
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

export default authMiddleware({
  afterAuth: async (auth, req) => {
    if (!auth.userId && !auth.isPublicRoute) {
      return redirectToSignIn({ returnBackUrl: req.url ?? '/' });
    }

    const ip = req.ip ?? '127.0.0.1';

    // Your subscription and rate limit checks here
    try {
      if (auth.userId) {
        // Define a mapping between paths and product IDs
        const regexToProductIds = {
          '^/dashboard/gtm.*': [
            'prod_OZZrME91D1Tyue',
            'prod_OaGCBK8Qe6Vofp',
            'prod_OoCMHi502SCeOH',
          ],
          '^/dashboard/ga.*': ['prod_OQ3TPC9yMxJAeN'],
        };

        // Subscription check
        for (const [regexString, productIds] of Object.entries(
          regexToProductIds
        )) {
          const regex = new RegExp(regexString);
          if (regex.test(req.nextUrl.pathname)) {
            const subscriptions = await getSubscriptions(auth.userId);
            const activeProductIds = subscriptions
              .filter((subscription) => subscription.status === 'active')
              .map((subscription) => subscription.productId);

            if (
              !activeProductIds.some((productId) =>
                productIds.includes(productId)
              )
            ) {
              logger.error(
                `User ${auth.userId} tried to access ${req.nextUrl.pathname} without the required subscription`
              );
              return NextResponse.redirect(new URL('/blocked', req.url));
            }
          }
        }

        // Rate limit check
        // Check the general API rate limit
        const generalRateLimitResult = await generalApiRateLimit.limit(ip);
        if (!generalRateLimitResult.success) {
          logger.error(
            `General API rate limit reached for IP ${ip} - ${generalRateLimitResult.remaining} remaining`
          );
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
              logger.error(
                `Feature rate limit reached for IP ${ip} - ${rateLimitResult.remaining} remaining - ${rule.urlPattern}}`
              );
              return NextResponse.redirect(new URL('/blocked', req.url));
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in middleware: ${error}`);
      return NextResponse.error();
    }

    // Continue with the request if user is authorized and passes all checks
    return NextResponse.next();
  },
  publicRoutes: [
    '/',
    '/about',
    '/features',
    '/pricing',
    '/contact',
    '/api/webhooks(.*)',
  ],
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};

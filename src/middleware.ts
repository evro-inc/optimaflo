import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from 'next-auth/react';
import {
  dashboardRateLimit,
  userRateLimit,
  subscriptionRateLimit,
  productRateLimit,
  priceRateLimit,
  checkoutSessionRateLimit,
  portalSessionRateLimit,
  customerRateLimit,
  generalApiRateLimit,
  gtmRateLimit,
} from './lib/redis/rateLimits';
import { getSubscriptions } from './lib/fetch/subscriptions';
import logger from './lib/logger';

// Middleware
export async function middleware(
  req: NextRequest
): Promise<Response | undefined> {
  // Define a mapping between paths and product IDs
  const regexToProductIds = {
    '^/dashboard/gtm.*': [
      'prod_OZZrME91D1Tyue',
      'prod_OaGCBK8Qe6Vofp',
      'prod_OoCMHi502SCeOH',
    ],
    '^/dashboard/ga.*': ['prod_OQ3TPC9yMxJAeN'],
  };

  const url = req.nextUrl.clone();
  url.pathname = '/';

  const reqHeader = {
    headers: {
      cookie: `next-auth.session-token=${
        req.cookies.get('next-auth.session-token')?.value
      }`,
    },
  };
  // Get the session data
  const session = await getSession({ req: reqHeader });
  try {
    let ip = req.ip ?? '127.0.0.1';

    if (req.nextUrl.pathname.startsWith('/api/auth')) {
      // if path is /api/auth/, just let the request pass through without any further checks
      return undefined;
    }

    // just let the request pass through without any further checks
    if (
      !req.nextUrl.pathname.startsWith('/api/auth') &&
      !req.nextUrl.pathname.startsWith('/api/products') &&
      !req.nextUrl.pathname.startsWith('/api/prices') &&
      !req.nextUrl.pathname.startsWith('/api/create-checkout-session') &&
      !req.nextUrl.pathname.startsWith('/api/create-portal-link')
    ) {
      // Pass req directly to getSession
      if (!session) {
        return NextResponse.redirect(url);
      }
    }

    // subscription check per regexToProductIds
    for (const [regexString, productIds] of Object.entries(regexToProductIds)) {
      const regex = new RegExp(regexString);
      if (regex.test(req.nextUrl.pathname)) {
        // get subscription Id from api/subscriptions
        const subscriptions = await getSubscriptions(
          (session as any)?.user?.id
        );

        // Filter out the active subscriptions and get their product IDs
        const activeProductIds = subscriptions
          .filter((subscription) => subscription.status === 'active')
          .map((subscription) => subscription.productId);

        // Check if any of the user's active product IDs match the product IDs required for the page
        if (
          !activeProductIds.some((productId) => productIds.includes(productId))
        ) {
          logger.error(
            `User ${session?.user?.id} tried to access ${req.nextUrl.pathname} without the required subscription`
          );
          // If none of the user's active product IDs are in the array, redirect them to an error page
          return NextResponse.redirect(new URL('/blocked', req.url));
        }
      }
    }

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
      { urlPattern: new RegExp('/api/users($|/.*)'), rateLimit: userRateLimit },
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
  } catch (error) {
    console.error(`Error in middleware: ${error}`); // log the error
    return NextResponse.error();
  }
}

export const config = {
  matcher: [
    '/profile/',
    '/dashboard/:path*',
    '/api/dashboard/:path*',
    '/api/users/:path*',
    '/api/customers/:path*',
    '/api/subscriptions/:path*',
    '/api/products/:path*',
    '/api/prices/:path*',
    '/api/create-checkout-session/:path*',
    '/api/create-portal-link/:path*',
  ],
  // REMOVE THIS LINE IN PRODUCTION
  // REMOVE THIS LINE IN PRODUCTION
  // REMOVE THIS LINE IN PRODUCTION
  // https://nextjs.org/docs/app/api-reference/edge#unsupported-apis
  unstable_allowDynamic: [
    '/node_modules/@babel/runtime/regenerator/index.js', // relax the check for all files in the utils directory
  ],
};

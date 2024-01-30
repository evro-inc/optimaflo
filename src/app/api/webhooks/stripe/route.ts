import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/src/lib/prisma';
import { stripe } from '@/src/lib/stripe';
import {
  fetchGtmSettings,
  grantGAAccess,
  grantGtmAccess,
} from '@/src/lib/fetch/dashboard';

// List of relevant Stripe webhook events
const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'checkout.session.completed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.created',
  'invoice.updated',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.finalized',
  'invoice.paid',
]);

// Product created or updated
async function upsertProductRecord(product: Stripe.Product) {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  await prisma.product.upsert({
    where: { id: product.id },
    update: {
      active: product.active,
      name: product.name,
      description: product.description,
      updated: currentTimestamp,
      metadata: product.metadata,
      image: product.images?.[0] || null,
    },
    create: {
      id: product.id,
      active: product.active,
      name: product.name,
      description: product.description,
      updated: currentTimestamp,
      metadata: product.metadata,
      image: product.images?.[0] || null,
    },
  });
}
// Product deleted
async function deleteProductRecord(product: Stripe.Product) {
  // Fetch all prices associated with the product
  const prices = await prisma.price.findMany({
    where: { productId: product.id },
  });

  // Delete each price individually
  for (const price of prices) {
    await prisma.price.delete({
      where: { id: price.id },
    });
  }

  // Delete the product
  await prisma.Product.delete({
    where: { id: product.id },
  });
}

// Price created or updated
async function upsertPriceRecord(price: Stripe.Price) {
  await prisma.Price.upsert({
    where: { id: price.id },
    update: {
      active: price.active,
      currency: price.currency,
      unitAmount: price.unit_amount !== null ? price.unit_amount : 0,
      ...(price.recurring?.interval && {
        recurringInterval: price.recurring.interval,
      }),
      ...(price.recurring?.interval_count && {
        recurringIntervalCount: price.recurring.interval_count,
      }),
      Product: { connect: { id: price.product as string } },
    },
    create: {
      id: price.id,
      active: price.active,
      currency: price.currency,
      unitAmount: price.unit_amount !== null ? price.unit_amount : 0,
      ...(price.recurring?.interval && {
        recurringInterval: price.recurring.interval,
      }),
      ...(price.recurring?.interval_count && {
        recurringIntervalCount: price.recurring.interval_count,
      }),
      Product: { connect: { id: price.product as string } },
      type: 'recurring',
      interval: price.recurring?.interval || 'month',
      intervalCount: price.recurring?.interval_count || 1,
      trialPeriodDays: 0, // You can set this value based on your requirements
    },
  });
}

// Handle Subscription Events Created or Updated by Stripe
async function upsertSubscriptionRecord(subscription: Stripe.Subscription) {
  try {
    const customerRecord = await prisma.customer.findFirst({
      where: {
        stripeCustomerId: subscription.customer as string,
      },
    });

    if (!customerRecord) {
      throw new Error('Customer record not found');
    }

    const userId = customerRecord.userId;
    const productId = subscription.items.data[0].plan.product as string;

    const subscriptionData = {
      subId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      created: new Date(subscription.created * 1000),
      Price: {
        connect: {
          id: subscription.items.data[0].price.id,
        },
      },
      Product: {
        connect: {
          id: productId,
        },
      },
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      endedAt: subscription.ended_at
        ? new Date(subscription.ended_at * 1000)
        : null,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      quantity: subscription.items.data[0]?.quantity || 1,
      User: {
        connect: {
          id: userId,
        },
      },
    };

    const createFeatureLimitsByTier = {
      /* Basic Tier */
      prod_PR67hSV5IpooDJ: {
        create: {
          GTMContainer: 3,
          GTMTags: 30,
          GTMTriggers: 40,
          GTMVariables: 60,
          GTMWorkspaces: 10,
          GTMVaraiblesBuiltIn: 150,
          //GTMClients: 1,
          GTMFolders: 10,
          GTMTemplates: 3,
          GTMTransformations: 9,
          GTMZones: 4,
          GTMVersions: 50,
          GA4Accounts: 2,
          GA4Properties: 3,
          GA4ConversionEvents: 10,
          GA4CustomDimensions: 20,
          GA4CustomMetrics: 15,
          GA4Streams: 3,
          GA4FBLinks: 1,
          GA4AdLinks: 1,
        },
        update: {
          GTMContainer: 3,
          GTMTags: 30,
          GTMTriggers: 40,
          GTMVariables: 60,
          GTMWorkspaces: 10,
          GTMVaraiblesBuiltIn: 150,
          //GTMClients: 1,
          GTMFolders: 10,
          GTMTemplates: 3,
          GTMTransformations: 9,
          GTMZones: 4,
          GTMVersions: 50,
          GA4Accounts: 2,
          GA4Properties: 3,
          GA4ConversionEvents: 10,
          GA4CustomDimensions: 20,
          GA4CustomMetrics: 15,
          GA4Streams: 3,
          GA4FBLinks: 1,
          GA4AdLinks: 1,
        },
        delete: {
          GTMContainer: 3,
          GTMTags: 30,
          GTMTriggers: 40,
          GTMVariables: 60,
          GTMWorkspaces: 10,
          GTMVaraiblesBuiltIn: 150,
          //GTMClients: 1,
          GTMFolders: 10,
          GTMTemplates: 3,
          GTMTransformations: 9,
          GTMZones: 5,
          GTMVersions: 50,
          GA4Accounts: 2,
          GA4Properties: 3,
          GA4ConversionEvents: 10,
          GA4CustomDimensions: 20,
          GA4CustomMetrics: 15,
          GA4Streams: 3,
          GA4FBLinks: 1,
          GA4AdLinks: 1,
        },
      },
      /* Pro Tier */
      prod_PR68ixfux75cGT: {
        create: {
          GTMContainer: 10,
          GTMTags: 60,
          GTMTriggers: 120,
          GTMVariables: 180,
          GTMWorkspaces: 30,
          GTMVaraiblesBuiltIn: 450,
          //GTMClients: 3,
          GTMFolders: 30,
          GTMTemplates: 10,
          GTMTransformations: 20,
          GTMZones: 15,
          GTMVersions: 150,
          GA4Accounts: 5,
          GA4Properties: 6,
          GA4ConversionEvents: 20,
          GA4CustomDimensions: 30,
          GA4CustomMetrics: 25,
          GA4Streams: 10,
          GA4FBLinks: 3,
          GA4AdLinks: 3,
        },
        update: {
          GTMContainer: 10,
          GTMTags: 60,
          GTMTriggers: 120,
          GTMVariables: 180,
          GTMWorkspaces: 30,
          GTMVaraiblesBuiltIn: 450,
          //GTMClients: 3,
          GTMFolders: 30,
          GTMTemplates: 10,
          GTMTransformations: 20,
          GTMZones: 15,
          GTMVersions: 150,
          GA4Accounts: 5,
          GA4Properties: 6,
          GA4ConversionEvents: 20,
          GA4CustomDimensions: 30,
          GA4CustomMetrics: 25,
          GA4Streams: 10,
          GA4FBLinks: 3,
          GA4AdLinks: 3,
        },
        delete: {
          GTMContainer: 10,
          GTMTags: 60,
          GTMTriggers: 120,
          GTMVariables: 180,
          GTMWorkspaces: 30,
          GTMVaraiblesBuiltIn: 450,
          //GTMClients: 3,
          GTMFolders: 30,
          GTMTemplates: 10,
          GTMTransformations: 20,
          GTMZones: 15,
          GTMVersions: 150,
          GA4Accounts: 5,
          GA4Properties: 6,
          GA4ConversionEvents: 20,
          GA4CustomDimensions: 30,
          GA4CustomMetrics: 25,
          GA4Streams: 10,
          GA4FBLinks: 3,
          GA4AdLinks: 3,
        },
      },
      /* Enterprise Tier */
      prod_PR6ETKqabgOXDt: {
        create: {
          GTMContainer: 10000,
          GTMTags: 10000,
          GTMTriggers: 10000,
          GTMVariables: 10000,
          GTMWorkspaces: 10000,
          GTMVaraiblesBuiltIn: 10000,
          GTMClients: 10000,
          GTMFolders: 10000,
          GTMTemplates: 10000,
          GTMTransformations: 10000,
          GTMZones: 10000,
          GTMVersions: 10000,
          GA4Accounts: 10000,
          GA4Properties: 10000,
          GA4ConversionEvents: 10000,
          GA4CustomDimensions: 10000,
          GA4CustomMetrics: 10000,
          GA4Streams: 10000,
          GA4FBLinks: 10000,
          GA4AdLinks: 10000,
        },
        update: {
          GTMContainer: 10000,
          GTMTags: 10000,
          GTMTriggers: 10000,
          GTMVariables: 10000,
          GTMWorkspaces: 10000,
          GTMVaraiblesBuiltIn: 10000,
          GTMClients: 10000,
          GTMFolders: 10000,
          GTMTemplates: 10000,
          GTMTransformations: 10000,
          GTMZones: 10000,
          GTMVersions: 10000,
          GA4Accounts: 10000,
          GA4Properties: 10000,
          GA4ConversionEvents: 10000,
          GA4CustomDimensions: 10000,
          GA4CustomMetrics: 10000,
          GA4Streams: 10000,
          GA4FBLinks: 10000,
          GA4AdLinks: 10000,
        },
        delete: {
          GTMContainer: 10000,
          GTMTags: 10000,
          GTMTriggers: 10000,
          GTMVariables: 10000,
          GTMWorkspaces: 10000,
          GTMVaraiblesBuiltIn: 10000,
          GTMClients: 10000,
          GTMFolders: 10000,
          GTMTemplates: 10000,
          GTMTransformations: 10000,
          GTMZones: 10000,
          GTMVersions: 10000,
          GA4Accounts: 10000,
          GA4Properties: 10000,
          GA4ConversionEvents: 10000,
          GA4CustomDimensions: 10000,
          GA4CustomMetrics: 10000,
          GA4Streams: 10000,
          GA4FBLinks: 10000,
          GA4AdLinks: 10000,
        },
      },
    };

    const createdOrUpdatedSubscription = await prisma.subscription.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: subscriptionData,
      create: subscriptionData,
    });

    // Confirm that the subscription was created or updated
    if (!createdOrUpdatedSubscription) {
      throw new Error('Failed to create or update subscription');
    }

    // Step 2: Upsert tier limits
    const featureLimits = createFeatureLimitsByTier[productId];

    if (!featureLimits) {
      return;
    }

    const operations: Promise<any>[] = [];

    for (const [featureName, limits] of Object.entries(featureLimits.create)) {
      const feature = await prisma.feature.findUnique({
        where: { name: featureName },
      });

      if (!feature) {
        continue;
      }

      const createLimit = limits;
      const updateLimit = featureLimits.update[featureName]; // Assuming the same feature exists in 'update'
      const deleteLimit = featureLimits.delete[featureName]; // Extract delete limit

      operations.push(
        prisma.tierLimit.upsert({
          where: {
            subscriptionId_featureId: {
              subscriptionId: createdOrUpdatedSubscription.id,
              featureId: feature.id,
            },
          },
          update: {
            createLimit,
            updateLimit,
            deleteLimit,
          },
          create: {
            createLimit,
            updateLimit,
            deleteLimit,
            featureId: feature.id,
            subscriptionId: createdOrUpdatedSubscription.id,
            productId,
          },
        })
      );
    }

    await prisma.$transaction(operations);
    if (createdOrUpdatedSubscription.status) {
      await prisma.subscription.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          status: createdOrUpdatedSubscription.status,
        },
        create: {
          status: createdOrUpdatedSubscription.status,
        },
      });
    }
  } catch (error: any) {
    throw new Error(error);
  }
}

// Handle Checkout Session Events Created by Stripe
async function upsertCheckoutSessionRecord(
  checkoutSession: Stripe.Checkout.Session
) {
  // Fetch user ID using the Stripe Customer ID
  const customerRecord = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: checkoutSession.customer as string,
    },
  });

  if (!customerRecord) {
    throw new Error('Customer record not found');
  }

  const userId = customerRecord.userId;

  // Retrieve the subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    checkoutSession.subscription as string
  );

  if (!stripeSubscription) {
    throw new Error('Stripe subscription not found');
  }

  // Check if the subscription exists in your database
  let subscription = await prisma.subscription.findUnique({
    where: { subId: stripeSubscription.id },
  });

  // If the subscription doesn't exist, create it
  if (!subscription) {
    subscription = await prisma.subscription.upsert({
      where: {
        userId_productId: {
          userId: userId,
          productId: stripeSubscription.items.data[0].plan.product as string,
        },
      },

      update: {
        subId: stripeSubscription.id,
        status: stripeSubscription.status, // <-- Use stripeSubscription.status instead of subscription.status
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, // <-- Use stripeSubscription.cancel_at_period_end instead of subscription.cancel_at_period_end
        created: new Date(stripeSubscription.created * 1000), // <-- Use stripeSubscription.created instead of subscription.created
        Price: {
          connect: {
            id: stripeSubscription.items.data[0].price.id,
          },
        },
        Product: {
          connect: {
            id: stripeSubscription.items.data[0].price.product as string,
          },
        },
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
        cancelAt: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null, // <-- Use stripeSubscription.cancel_at instead of subscription.cancel_at
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null, // <-- Use stripeSubscription.canceled_at instead of subscription.canceled_at
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null, // <-- Use stripeSubscription.trial_start instead of subscription.trial_start
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null, // <-- Use stripeSubscription.trial_end instead of subscription.trial_end
        quantity: stripeSubscription.items.data[0]?.quantity || 1, // <-- Use stripeSubscription.items.data[0]?.quantity instead of subscription.items.data[0]?.quantity
        User: {
          connect: {
            id: userId,
          },
        },
      },
      create: {
        subId: stripeSubscription.id,
        status: stripeSubscription.status, // <-- Use stripeSubscription.status instead of subscription.status
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, // <-- Use stripeSubscription.cancel_at_period_end instead of subscription.cancel_at_period_end
        created: new Date(stripeSubscription.created * 1000), // <-- Use stripeSubscription.created instead of subscription.created
        Price: {
          connect: {
            id: stripeSubscription.items.data[0].price.id,
          },
        },
        Product: {
          connect: {
            id: stripeSubscription.items.data[0].price.product as string,
          },
        },
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
        cancelAt: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null, // <-- Use stripeSubscription.cancel_at instead of subscription.cancel_at
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null, // <-- Use stripeSubscription.canceled_at instead of subscription.canceled_at
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null, // <-- Use stripeSubscription.trial_start instead of subscription.trial_start
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null, // <-- Use stripeSubscription.trial_end instead of subscription.trial_end
        quantity: stripeSubscription.items.data[0]?.quantity || 1, // <-- Use stripeSubscription.items.data[0]?.quantity instead of subscription.items.data[0]?.quantity
        User: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  // Check if the checkoutSession exists, if not, create a new checkoutSession record
  await prisma.checkoutSession.upsert({
    where: { id: subscription.id },
    update: {
      paymentStatus: checkoutSession.payment_status,
      amountTotal:
        checkoutSession.amount_total !== null
          ? checkoutSession.amount_total
          : 0, // default to 0 if null
      currency:
        checkoutSession.currency !== null ? checkoutSession.currency : 'usd', // default to 'usd' if null
      userId: userId,
      subscriptionId: subscription.id,
    },
    create: {
      id: checkoutSession.id,
      paymentStatus: checkoutSession.payment_status,
      amountTotal:
        checkoutSession.amount_total !== null
          ? checkoutSession.amount_total
          : 0, // default to 0 if null
      currency:
        checkoutSession.currency !== null ? checkoutSession.currency : 'usd', // default to 'usd' if null
      userId: userId,
      subscriptionId: subscription.id,
    },
  });
}

// Handle Invoice Events Created or Updated by Stripe
async function upsertInvoiceRecord(invoice: Stripe.Invoice) {
  // Fetch user ID using the Stripe Customer ID
  const customerRecord = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: invoice.customer as string,
    },
  });

  if (!customerRecord) {
    throw new Error('Customer record not found');
  }

  const userId = customerRecord.userId;

  // Retrieve the subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );

  if (!stripeSubscription) {
    throw new Error('Stripe subscription not found');
  }

  // Check if the subscription exists in your database
  let subscription = await prisma.subscription.findUnique({
    where: { subId: stripeSubscription.id },
  });
  const productId = stripeSubscription.items.data[0].plan.product as string;

  // If the subscription doesn't exist, create it
  if (!subscription) {
    subscription = await prisma.subscription.upsert({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId,
        },
      },

      update: {
        subId: stripeSubscription.id,
        status: stripeSubscription.status, // <-- Use stripeSubscription.status instead of subscription.status
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, // <-- Use stripeSubscription.cancel_at_period_end instead of subscription.cancel_at_period_end
        created: new Date(stripeSubscription.created * 1000), // <-- Use stripeSubscription.created instead of subscription.created
        Price: {
          connect: {
            id: stripeSubscription.items.data[0].price.id,
          },
        },
        Product: {
          connect: {
            id: stripeSubscription.items.data[0].price.product as string,
          },
        },
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
        cancelAt: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null, // <-- Use stripeSubscription.cancel_at instead of subscription.cancel_at
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null, // <-- Use stripeSubscription.canceled_at instead of subscription.canceled_at
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null, // <-- Use stripeSubscription.trial_start instead of subscription.trial_start
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null, // <-- Use stripeSubscription.trial_end instead of subscription.trial_end
        quantity: stripeSubscription.items.data[0]?.quantity || 1, // <-- Use stripeSubscription.items.data[0]?.quantity instead of subscription.items.data[0]?.quantity
        User: {
          connect: {
            id: userId,
          },
        },
      },
      create: {
        subId: stripeSubscription.id,
        status: stripeSubscription.status, // <-- Use stripeSubscription.status instead of subscription.status
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end, // <-- Use stripeSubscription.cancel_at_period_end instead of subscription.cancel_at_period_end
        created: new Date(stripeSubscription.created * 1000), // <-- Use stripeSubscription.created instead of subscription.created
        Price: {
          connect: {
            id: stripeSubscription.items.data[0].price.id,
          },
        },
        Product: {
          connect: {
            id: stripeSubscription.items.data[0].price.product as string,
          },
        },
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
        cancelAt: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null, // <-- Use stripeSubscription.cancel_at instead of subscription.cancel_at
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null, // <-- Use stripeSubscription.canceled_at instead of subscription.canceled_at
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null, // <-- Use stripeSubscription.trial_start instead of subscription.trial_start
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null, // <-- Use stripeSubscription.trial_end instead of subscription.trial_end
        quantity: stripeSubscription.items.data[0]?.quantity || 1, // <-- Use stripeSubscription.items.data[0]?.quantity instead of subscription.items.data[0]?.quantity
        User: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  // Upsert the invoice
  await prisma.invoice.upsert({
    where: { id: invoice.id },
    update: {
      customerId: invoice.customer as string,
      subscriptionId: subscription.id,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      paid: invoice.paid,
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000)
        : new Date(invoice.created * 1000 + 30 * 24 * 60 * 60 * 1000),
      userId: userId,
    },
    create: {
      id: invoice.id,
      customerId: invoice.customer as string,
      subscriptionId: subscription.id,
      amountPaid: invoice.amount_paid,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      paid: invoice.paid,
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000)
        : new Date(invoice.created * 1000 + 30 * 24 * 60 * 60 * 1000),
      userId: userId,
    },
  });
}

async function grantAccessToContent(invoice: Stripe.Invoice) {
  // needs to match ids for grantGtmAccess function
  const productAccessGranters = {
    prod_PR67hSV5IpooDJ: grantGtmAccess,
    prod_PR68ixfux75cGT: grantGtmAccess,
    prod_PR6ETKqabgOXDt: grantGtmAccess,

    prod_PR67hSV5IpooDJ_GA4: grantGAAccess,
    prod_PR68ixfux75cGT_GA4: grantGAAccess,
    prod_PR6ETKqabgOXDt_GA4: grantGAAccess,
  };

  // Get the product IDs associated with the invoice
  const productIds = invoice.lines.data
    .filter((line) => line.price !== null)
    .map((line) => line.price!.product as string);

  // Iterate over the product IDs
  for (const productId of productIds) {
    // Get the function that grants access for this product
    const grantAccess = productAccessGranters[productId];

    // If a function was found, call it to grant access
    if (grantAccess) {
      await grantAccess(invoice.customer);
    }
  }
}

// Fetch GTM Settings
async function fetchGTM(invoice: Stripe.Invoice) {
  // Fetch user ID using the Stripe Customer ID
  const customerRecord = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: invoice.customer as string,
    },
  });

  if (!customerRecord) {
    throw new Error('Customer record not found');
  }

  const userId = customerRecord.userId;

  if (!userId) {
    throw new Error('User ID not found');
  }
  if (customerRecord) {
    await fetchGtmSettings(userId);
  }
}

// Reset Usage for Subscription
async function resetUsageForSubscription(subscriptionId: string) {
  await prisma.tierLimit.updateMany({
    where: {
      subscriptionId: subscriptionId,
    },
    data: {
      createUsage: 0,
      updateUsage: 0,
    },
  });
}

// Customer deleted
async function deleteCustomerAndRelatedRecords(stripeCustomerId: string) {
  try {
    // Start a transaction
    await prisma.$transaction(async (prisma) => {
      // Delete related sessions
      await prisma.session.deleteMany({ where: { userId: stripeCustomerId } });

      // Delete related invoices
      await prisma.invoice.deleteMany({
        where: { customerId: stripeCustomerId },
      });

      // Delete related checkout sessions
      await prisma.checkoutSession.deleteMany({
        where: { userId: stripeCustomerId },
      });

      // Delete related subscriptions
      await prisma.subscription.deleteMany({
        where: { userId: stripeCustomerId },
      });

      // Delete related product access records
      await prisma.productAccess.deleteMany({
        where: { userId: stripeCustomerId },
      });

      // Delete related gtm records
      await prisma.gtm.deleteMany({ where: { userId: stripeCustomerId } });

      await prisma.tierLimit.deleteMany({
        where: { subscriptionId: stripeCustomerId },
      });

      // Finally, delete the customer record
      await prisma.customer.delete({ where: { stripeCustomerId } });
    });
  } catch (error) {
    throw new Error('Failed to delete customer');
    // Handle the error appropriately
  }
}

// Handle Stripe Webhook Events
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'customer.deleted':
          await deleteCustomerAndRelatedRecords(event.data.object.id);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await upsertSubscriptionRecord(
            event.data.object as Stripe.Subscription
          );

          break;
        case 'checkout.session.completed':
          await upsertCheckoutSessionRecord(
            event.data.object as Stripe.Checkout.Session
          );
          break;
        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
        case 'invoice.finalized':
        case 'invoice.paid':
          await upsertInvoiceRecord(event.data.object as Stripe.Invoice);
          await grantAccessToContent(event.data.object as Stripe.Invoice);
          await fetchGTM(event.data.object as Stripe.Invoice);
          await resetUsageForSubscription(
            (event.data.object as Stripe.Invoice).subscription as string
          );
          break;
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error: unknown) {
      const err = error as Error;
      return NextResponse.json(
        { error: `Webhook handler failed. ${err.message}` },
        { status: 400 }
      );
    }
  } else {
    // Add a response for non-relevant events
    return NextResponse.json({ ignored: true });
  }
  return NextResponse.json({ received: true });
}

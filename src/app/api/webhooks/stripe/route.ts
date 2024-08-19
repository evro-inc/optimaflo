import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/src/lib/prisma';
import { stripe } from '@/src/lib/stripe';
import { fetchGASettings, fetchGtmSettings } from '@/src/lib/fetch/dashboard';

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

// Product created or updated
async function upsertFeatureLimitsRecord(product: Stripe.Product) {
  const tier = product.metadata?.tier;
  const productId = product.id

  let defaultFeatureLimits: { featureName: string, createLimit: number, updateLimit: number, deleteLimit: number }[] = [];

  switch (tier) {
    case 'analyst':
      defaultFeatureLimits = [
        { featureName: 'GTMContainer', createLimit: 3, updateLimit: 3, deleteLimit: 3 },
        { featureName: 'GTMTags', createLimit: 30, updateLimit: 30, deleteLimit: 30 },
        { featureName: 'GTMTriggers', createLimit: 40, updateLimit: 40, deleteLimit: 40 },
        { featureName: 'GTMClients', createLimit: 40, updateLimit: 40, deleteLimit: 40 },
        { featureName: 'GTMVariables', createLimit: 60, updateLimit: 60, deleteLimit: 60 },
        { featureName: 'GTMWorkspaces', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GTMVariablesBuiltIn', createLimit: 150, updateLimit: 150, deleteLimit: 150 },
        { featureName: 'GTMFolders', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GTMTemplates', createLimit: 3, updateLimit: 3, deleteLimit: 3 },
        { featureName: 'GTMTransformations', createLimit: 9, updateLimit: 9, deleteLimit: 9 },
        { featureName: 'GTMZones', createLimit: 4, updateLimit: 4, deleteLimit: 5 },
        { featureName: 'GTMVersions', createLimit: 50, updateLimit: 50, deleteLimit: 50 },
        { featureName: 'GA4Accounts', createLimit: 3, updateLimit: 3, deleteLimit: 3 },
        { featureName: 'GA4Properties', createLimit: 6, updateLimit: 6, deleteLimit: 6 },
        { featureName: 'GA4ConversionEvents', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
        { featureName: 'GA4CustomDimensions', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
        { featureName: 'GA4CustomMetrics', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
        { featureName: 'GA4Streams', createLimit: 3, updateLimit: 3, deleteLimit: 3 },
        { featureName: 'GA4FBLinks', createLimit: 2, updateLimit: 2, deleteLimit: 2 },
        { featureName: 'GA4AdLinks', createLimit: 2, updateLimit: 2, deleteLimit: 2 },
        { featureName: 'GA4AccountAccess', createLimit: 10, updateLimit: 10, deleteLimit: 5 },
        { featureName: 'GA4PropertyAccess', createLimit: 10, updateLimit: 10, deleteLimit: 5 },
        { featureName: 'GA4Audiences', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GA4KeyEvents', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
      ];
      break;
    case 'consultant':
      defaultFeatureLimits = [
        { featureName: 'GTMContainer', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GTMTags', createLimit: 60, updateLimit: 60, deleteLimit: 60 },
        { featureName: 'GTMTriggers', createLimit: 120, updateLimit: 120, deleteLimit: 120 },
        { featureName: 'GTMVariables', createLimit: 180, updateLimit: 180, deleteLimit: 180 },
        { featureName: 'GTMWorkspaces', createLimit: 30, updateLimit: 30, deleteLimit: 30 },
        { featureName: 'GTMVariablesBuiltIn', createLimit: 450, updateLimit: 450, deleteLimit: 450 },
        { featureName: 'GTMFolders', createLimit: 30, updateLimit: 30, deleteLimit: 30 },
        { featureName: 'GTMTemplates', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GTMTransformations', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
        { featureName: 'GTMZones', createLimit: 15, updateLimit: 15, deleteLimit: 15 },
        { featureName: 'GTMVersions', createLimit: 150, updateLimit: 150, deleteLimit: 150 },
        { featureName: 'GA4Accounts', createLimit: 6, updateLimit: 6, deleteLimit: 6 },
        { featureName: 'GA4Properties', createLimit: 12, updateLimit: 12, deleteLimit: 12 },
        { featureName: 'GA4ConversionEvents', createLimit: 40, updateLimit: 40, deleteLimit: 40 },
        { featureName: 'GA4CustomDimensions', createLimit: 40, updateLimit: 40, deleteLimit: 40 },
        { featureName: 'GA4CustomMetrics', createLimit: 40, updateLimit: 40, deleteLimit: 40 },
        { featureName: 'GA4Streams', createLimit: 12, updateLimit: 12, deleteLimit: 12 },
        { featureName: 'GA4FBLinks', createLimit: 6, updateLimit: 6, deleteLimit: 6 },
        { featureName: 'GA4AdLinks', createLimit: 6, updateLimit: 6, deleteLimit: 6 },
        { featureName: 'GA4AccountAccess', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GA4PropertyAccess', createLimit: 10, updateLimit: 10, deleteLimit: 10 },
        { featureName: 'GA4Audiences', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
        { featureName: 'GA4KeyEvents', createLimit: 20, updateLimit: 20, deleteLimit: 20 },
      ];
      break;
    case 'enterprise':
      defaultFeatureLimits = [
        { featureName: 'GTMContainer', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMTags', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMTriggers', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMVariables', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMWorkspaces', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMVariablesBuiltIn', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMClients', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMFolders', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMTemplates', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMTransformations', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMZones', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GTMVersions', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4Accounts', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4Properties', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4ConversionEvents', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4CustomDimensions', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4CustomMetrics', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4Streams', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4FBLinks', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4AdLinks', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4AccountAccess', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4PropertyAccess', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4Audiences', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
        { featureName: 'GA4KeyEvents', createLimit: 10000, updateLimit: 10000, deleteLimit: 10000 },
      ];
      break;
    default:
      break;
  }

  const operations = defaultFeatureLimits.map((limit) => {
    return prisma.feature.findUnique({
      where: { name: limit.featureName },
    }).then((feature) => {
      if (feature) {
        return prisma.tierFeatureLimit.findFirst({
          where: {
            productId: productId,
            featureId: feature.id,
          },
        }).then((existingLimit) => {
          if (existingLimit) {
            return prisma.tierFeatureLimit.update({
              where: { id: existingLimit.id },
              data: {
                createLimit: limit.createLimit,
                updateLimit: limit.updateLimit,
                deleteLimit: limit.deleteLimit,
              },
            });
          } else {
            return prisma.tierFeatureLimit.create({
              data: {
                productId: productId,
                featureId: feature.id,
                createLimit: limit.createLimit,
                updateLimit: limit.updateLimit,
                deleteLimit: limit.deleteLimit,
              },
            });
          }
        });
      }
      return null; // Ensures that the map always returns a promise
    });
  });

  // Ensure to filter out any null operations (if `feature` was not found)
  await prisma.$transaction(operations.filter(Boolean));


}

// Product deleted
async function deleteProductRecord(product: Stripe.Product) {
  // Start a transaction to ensure atomic operations
  await prisma.$transaction(async (prisma) => {
    // Delete all related records in TierFeatureLimit
    await prisma.tierFeatureLimit.deleteMany({
      where: { productId: product.id },
    });

    // Delete all related records in TierLimit
    await prisma.tierLimit.deleteMany({
      where: { productId: product.id },
    });

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
    await prisma.product.delete({
      where: { id: product.id },
    });
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
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      quantity: subscription.items.data[0]?.quantity || 1,
      User: {
        connect: {
          id: userId,
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

    if (!createdOrUpdatedSubscription) {
      throw new Error('Failed to create or update subscription');
    }

    // Step 2: Fetch and Upsert tier limits
    const tierFeatureLimits = await prisma.tierFeatureLimit.findMany({
      where: {
        productId: productId,
      },
    });

    if (!tierFeatureLimits || tierFeatureLimits.length === 0) {
      console.warn(`No tier limits found for product ID: ${productId}`);
      return;
    }

    const operations: Promise<any>[] = [];

    for (const limit of tierFeatureLimits) {
      operations.push(
        prisma.tierLimit.upsert({
          where: {
            subscriptionId_featureId: {
              subscriptionId: createdOrUpdatedSubscription.id,
              featureId: limit.featureId,
            },
          },
          update: {
            createLimit: limit.createLimit,
            updateLimit: limit.updateLimit,
            deleteLimit: limit.deleteLimit,
          },
          create: {
            createLimit: limit.createLimit,
            updateLimit: limit.updateLimit,
            deleteLimit: limit.deleteLimit,
            featureId: limit.featureId,
            subscriptionId: createdOrUpdatedSubscription.id,
            productId,
          },
        })
      );
    }

    await prisma.$transaction(operations);

  } catch (error: any) {
    console.error(`Error upserting subscription: ${error.message}`);
    throw new Error(error);
  }
}


// Handle Checkout Session Events Created by Stripe
async function upsertCheckoutSessionRecord(checkoutSession: Stripe.Checkout.Session) {
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
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
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
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000), // <-- Use stripeSubscription.current_period_start instead of subscription.current_period_start
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000), // <-- Use stripeSubscription.current_period_end instead of subscription.current_period_end
        endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null, // <-- Use stripeSubscription.ended_at instead of subscription.ended_at
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
      amountTotal: checkoutSession.amount_total !== null ? checkoutSession.amount_total : 0, // default to 0 if null
      currency: checkoutSession.currency !== null ? checkoutSession.currency : 'usd', // default to 'usd' if null
      userId: userId,
      subscriptionId: subscription.id,
    },
    create: {
      id: checkoutSession.id,
      paymentStatus: checkoutSession.payment_status,
      amountTotal: checkoutSession.amount_total !== null ? checkoutSession.amount_total : 0, // default to 0 if null
      currency: checkoutSession.currency !== null ? checkoutSession.currency : 'usd', // default to 'usd' if null
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
  const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  if (!stripeSubscription) {
    throw new Error('Stripe subscription not found');
  }

  // Upsert the subscription record in your database
  const productId = stripeSubscription.items.data[0].plan.product as string;

  await prisma.subscription.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    update: {
      subId: stripeSubscription.id,
      status: stripeSubscription.status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      created: new Date(stripeSubscription.created * 1000),
      Price: {
        connect: {
          id: stripeSubscription.items.data[0].price.id,
        },
      },
      Product: {
        connect: {
          id: productId,
        },
      },
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
      cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      quantity: stripeSubscription.items.data[0]?.quantity || 1,
      User: {
        connect: {
          id: userId,
        },
      },
    },
    create: {
      subId: stripeSubscription.id,
      status: stripeSubscription.status,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      created: new Date(stripeSubscription.created * 1000),
      Price: {
        connect: {
          id: stripeSubscription.items.data[0].price.id,
        },
      },
      Product: {
        connect: {
          id: productId,
        },
      },
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      endedAt: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
      cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      quantity: stripeSubscription.items.data[0]?.quantity || 1,
      User: {
        connect: {
          id: userId,
        },
      },
    },
  });

  // Upsert the invoice
  await prisma.invoice.upsert({
    where: { id: invoice.id },
    update: {
      customerId: invoice.customer as string,
      subscriptionId: stripeSubscription.id,
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
      subscriptionId: stripeSubscription.id,
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

  // Grant access to the content associated with the invoice
  await grantAccessToContent(invoice);
}

export async function grantAccessToContent(invoice: Stripe.Invoice) {
  // Fetch the customer record to get the user ID
  const customerRecord = await prisma.customer.findFirst({
    where: {
      stripeCustomerId: invoice.customer as string,
    },
  });

  if (!customerRecord) {
    throw new Error('Customer record not found');
  }

  const userId = customerRecord.userId;

  // Get the product IDs associated with the invoice
  const productIds = invoice.lines.data
    .filter((line) => line.price !== null)
    .map((line) => line.price!.product as string);

  // Iterate over the product IDs and grant access for each one
  for (const productId of productIds) {
    // Update the ProductAccess record for this user and product to grant access
    await prisma.productAccess.upsert({
      where: { userId_productId: { userId, productId } },
      update: { granted: true },
      create: { userId, productId, granted: true },
    });
  }
}

// Fetch GTM Settings
async function fetchGoogle(invoice: Stripe.Invoice) {
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
    await fetchGASettings(userId);
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

      await prisma.ga.deleteMany({ where: { userId: stripeCustomerId } });

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE ?? process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          await upsertFeatureLimitsRecord(event.data.object as Stripe.Product)
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
          await upsertSubscriptionRecord(event.data.object as Stripe.Subscription);

          break;
        case 'checkout.session.completed':
          await upsertCheckoutSessionRecord(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
        case 'invoice.finalized':
        case 'invoice.paid':
          await upsertInvoiceRecord(event.data.object as Stripe.Invoice);
          await grantAccessToContent(event.data.object as Stripe.Invoice);
          await fetchGoogle(event.data.object as Stripe.Invoice);
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

import { getURL } from '../helpers';
import prisma from '../prisma';

export async function getFeature(userId: string) {
  const feature = await prisma.feature.findFirst({
    where: {
      userId: userId,
    },
    include: {
      TierLimits: true,
    },
  });
  return feature;
}

export async function getTierLimit(subscriptionId: string) {
  const tierLimit = await prisma.tierLimit.findMany({
    where: {
      subscriptionId: subscriptionId,
    },
    include: {
      Feature: true,
      Subscription: true,
    },
  });
  return tierLimit;
}

import prisma from '../prisma';

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

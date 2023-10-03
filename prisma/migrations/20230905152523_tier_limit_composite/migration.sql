/*
  Warnings:

  - A unique constraint covering the columns `[subscriptionId,featureId]` on the table `TierLimit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TierLimit_subscriptionId_featureId_key" ON "TierLimit"("subscriptionId", "featureId");

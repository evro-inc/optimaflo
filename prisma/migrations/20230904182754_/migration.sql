/*
  Warnings:

  - You are about to drop the column `limit` on the `Feature` table. All the data in the column will be lost.
  - You are about to drop the `FeatureLimit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FeatureLimit" DROP CONSTRAINT "FeatureLimit_feature_id_fkey";

-- DropForeignKey
ALTER TABLE "FeatureLimit" DROP CONSTRAINT "FeatureLimit_subscription_id_fkey";

-- AlterTable
ALTER TABLE "Feature" DROP COLUMN "limit";

-- DropTable
DROP TABLE "FeatureLimit";

-- CreateTable
CREATE TABLE "TierLimit" (
    "id" TEXT NOT NULL,
    "limit" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "subscriptionId" TEXT,

    CONSTRAINT "TierLimit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TierLimit" ADD CONSTRAINT "TierLimit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierLimit" ADD CONSTRAINT "TierLimit_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierLimit" ADD CONSTRAINT "TierLimit_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

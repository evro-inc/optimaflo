/*
  Warnings:

  - You are about to drop the column `featureName` on the `TierFeatureLimit` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `TierFeatureLimit` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_id,feature_id]` on the table `TierFeatureLimit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `feature_id` to the `TierFeatureLimit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `TierFeatureLimit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TierFeatureLimit" DROP COLUMN "featureName",
DROP COLUMN "productId",
ADD COLUMN     "feature_id" TEXT NOT NULL,
ADD COLUMN     "product_id" TEXT NOT NULL,
ALTER COLUMN "createLimit" SET DEFAULT 0,
ALTER COLUMN "updateLimit" SET DEFAULT 0,
ALTER COLUMN "deleteLimit" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "TierFeatureLimit_product_id_feature_id_key" ON "TierFeatureLimit"("product_id", "feature_id");

-- AddForeignKey
ALTER TABLE "TierFeatureLimit" ADD CONSTRAINT "TierFeatureLimit_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierFeatureLimit" ADD CONSTRAINT "TierFeatureLimit_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

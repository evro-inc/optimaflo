/*
  Warnings:

  - A unique constraint covering the columns `[subId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "subId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subId_key" ON "Subscription"("subId");

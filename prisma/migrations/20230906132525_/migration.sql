/*
  Warnings:

  - You are about to drop the column `usage` on the `TierLimit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TierLimit" DROP COLUMN "usage",
ADD COLUMN     "createUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updateUsage" INTEGER NOT NULL DEFAULT 0;

/*
  Warnings:

  - You are about to drop the column `limit` on the `TierLimit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TierLimit" DROP COLUMN "limit",
ADD COLUMN     "createLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updateLimit" INTEGER NOT NULL DEFAULT 0;

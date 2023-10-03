/*
  Warnings:

  - Added the required column `updated` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Price" ADD COLUMN     "recurringInterval" TEXT,
ADD COLUMN     "recurringIntervalCount" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "updated" INTEGER NOT NULL;

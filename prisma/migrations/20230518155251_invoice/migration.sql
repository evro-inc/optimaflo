/*
  Warnings:

  - Made the column `stripe_customer_id` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_stripe_customer_id_fkey";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "stripe_customer_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stripe_customer_id_fkey" FOREIGN KEY ("stripe_customer_id") REFERENCES "User"("stripeCustomerId") ON DELETE RESTRICT ON UPDATE CASCADE;

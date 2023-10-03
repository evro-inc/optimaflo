/*
  Warnings:

  - You are about to drop the column `stripeInvoiceId` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `stripe_invoice_id` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "stripeInvoiceId",
ADD COLUMN     "stripe_invoice_id" TEXT NOT NULL;

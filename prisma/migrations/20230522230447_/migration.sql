/*
  Warnings:

  - You are about to drop the column `stripe_invoice_id` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stripeInvoiceId` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "stripe_invoice_id",
ADD COLUMN     "stripeInvoiceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

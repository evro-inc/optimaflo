/*
  Warnings:

  - You are about to drop the column `amountDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `chargeId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `periodEnd` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_customer_id` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Invoice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount_due` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount_paid` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_date` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscription_id` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_stripe_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";

-- DropIndex
DROP INDEX "Invoice_stripeInvoiceId_key";

-- DropIndex
DROP INDEX "invoice_customerId";

-- DropIndex
DROP INDEX "invoice_subscriptionId";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amountDue",
DROP COLUMN "chargeId",
DROP COLUMN "createdAt",
DROP COLUMN "dueDate",
DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
DROP COLUMN "stripeInvoiceId",
DROP COLUMN "stripe_customer_id",
DROP COLUMN "subscriptionId",
DROP COLUMN "total",
DROP COLUMN "updatedAt",
ADD COLUMN     "amount_due" INTEGER NOT NULL,
ADD COLUMN     "amount_paid" INTEGER NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "due_date" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "subscription_id" TEXT NOT NULL,
ADD COLUMN     "userId" UUID,
ALTER COLUMN "created" SET DATA TYPE TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripe_customer_id_key" ON "Customer"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("stripe_customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

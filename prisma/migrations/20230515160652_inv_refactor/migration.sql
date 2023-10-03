-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "chargeId" TEXT;

-- CreateIndex
CREATE INDEX "invoice_customerId" ON "Invoice"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "invoice_subscriptionId" ON "Invoice"("subscriptionId");

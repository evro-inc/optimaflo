-- CreateTable
CREATE TABLE "ga" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,

    CONSTRAINT "ga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gaSettingsUserId" ON "ga"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ga_user_id_account_id_property_id_key" ON "ga"("user_id", "account_id", "property_id");

-- AddForeignKey
ALTER TABLE "ga" ADD CONSTRAINT "ga_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

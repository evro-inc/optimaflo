/*
  Warnings:

  - You are about to drop the `SettingGtm` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SettingGtm" DROP CONSTRAINT "SettingGtm_user_id_fkey";

-- DropTable
DROP TABLE "SettingGtm";

-- CreateTable
CREATE TABLE "gtm" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,

    CONSTRAINT "gtm_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "gtmSettingsUserId" ON "gtm"("user_id");

-- AddForeignKey
ALTER TABLE "gtm" ADD CONSTRAINT "gtm_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

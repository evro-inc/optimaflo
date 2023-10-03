/*
  Warnings:

  - You are about to drop the `GTMSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "GTMSetting" DROP CONSTRAINT "GTMSetting_user_id_fkey";

-- DropTable
DROP TABLE "GTMSetting";

-- CreateTable
CREATE TABLE "SettingGtm" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "SettingGtm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SettingGtm_user_id_key" ON "SettingGtm"("user_id");

-- CreateIndex
CREATE INDEX "gtmSettingsUserId" ON "SettingGtm"("user_id");

-- AddForeignKey
ALTER TABLE "SettingGtm" ADD CONSTRAINT "SettingGtm_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

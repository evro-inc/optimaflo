/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `GTMSetting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GTMSetting_user_id_key" ON "GTMSetting"("user_id");

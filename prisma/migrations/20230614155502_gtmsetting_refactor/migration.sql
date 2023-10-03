/*
  Warnings:

  - The primary key for the `SettingGtm` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "SettingGtm_user_id_key";

-- AlterTable
ALTER TABLE "SettingGtm" DROP CONSTRAINT "SettingGtm_pkey",
ADD CONSTRAINT "SettingGtm_pkey" PRIMARY KEY ("user_id");

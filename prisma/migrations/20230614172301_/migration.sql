/*
  Warnings:

  - The primary key for the `gtm` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "gtm" DROP CONSTRAINT "gtm_pkey",
ADD CONSTRAINT "gtm_pkey" PRIMARY KEY ("id");

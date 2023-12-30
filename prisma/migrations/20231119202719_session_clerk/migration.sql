/*
  Warnings:

  - Added the required column `createdAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expireAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastActiveAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "abandonAt" INTEGER,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "createdAt" INTEGER NOT NULL,
ADD COLUMN     "expireAt" INTEGER NOT NULL,
ADD COLUMN     "lastActiveAt" INTEGER NOT NULL,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "updatedAt" INTEGER NOT NULL,
ALTER COLUMN "sessionToken" DROP NOT NULL,
ALTER COLUMN "expires" DROP NOT NULL;

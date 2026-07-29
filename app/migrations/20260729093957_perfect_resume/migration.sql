/*
  Warnings:

  - You are about to drop the column `lemonSqueezyCustomerPortalUrl` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lemonSqueezyCustomerPortalUrl";

-- CreateTable
CREATE TABLE "ResumeGeneration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputFileName" TEXT NOT NULL,
    "atsScore" INTEGER,

    CONSTRAINT "ResumeGeneration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ResumeGeneration" ADD CONSTRAINT "ResumeGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

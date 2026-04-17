/*
  Warnings:

  - You are about to drop the column `pin_code` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserProvider" AS ENUM ('GMAIL', 'GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "pin_code",
ADD COLUMN     "provider" "UserProvider" NOT NULL DEFAULT 'GOOGLE';

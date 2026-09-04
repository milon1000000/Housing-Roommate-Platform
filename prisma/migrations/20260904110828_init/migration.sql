/*
  Warnings:

  - You are about to drop the column `images` on the `properties` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "properties" DROP COLUMN "images",
ADD COLUMN     "imagePublicId" TEXT[],
ADD COLUMN     "imageUrl" TEXT[];

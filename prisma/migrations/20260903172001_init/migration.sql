/*
  Warnings:

  - You are about to drop the column `nidOrPassport` on the `landlords` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nidOrPassportNumber]` on the table `landlords` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nidOrPassportNumber` to the `landlords` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "landlords_nidOrPassport_key";

-- AlterTable
ALTER TABLE "landlords" DROP COLUMN "nidOrPassport",
ADD COLUMN     "nidOrPassportNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "landlords_nidOrPassportNumber_key" ON "landlords"("nidOrPassportNumber");

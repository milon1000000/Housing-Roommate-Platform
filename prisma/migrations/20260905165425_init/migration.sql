/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `utility_bills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "utility_bills" DROP CONSTRAINT "utility_bills_propertyId_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "utility_bills";

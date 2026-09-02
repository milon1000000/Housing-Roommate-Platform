/*
  Warnings:

  - The values [DOCTOR,PATIENT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Schedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `appoinments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `doctors` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `patients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LandlordVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'LANDLORD', 'TENANT');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TENANT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "appoinments" DROP CONSTRAINT "appoinments_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "appoinments" DROP CONSTRAINT "appoinments_patientId_fkey";

-- DropForeignKey
ALTER TABLE "appoinments" DROP CONSTRAINT "appoinments_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_userId_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_userId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_appointmentId_fkey";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TENANT';

-- DropTable
DROP TABLE "Schedule";

-- DropTable
DROP TABLE "appoinments";

-- DropTable
DROP TABLE "doctors";

-- DropTable
DROP TABLE "patients";

-- DropTable
DROP TABLE "payments";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "DoctorVerificationStatus";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ScheduleStatus";

-- CreateTable
CREATE TABLE "landlords" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "nidOrPassport" TEXT NOT NULL,
    "verificationStatus" "LandlordVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "landlords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landlords_email_key" ON "landlords"("email");

-- CreateIndex
CREATE UNIQUE INDEX "landlords_nidOrPassport_key" ON "landlords"("nidOrPassport");

-- CreateIndex
CREATE UNIQUE INDEX "landlords_userId_key" ON "landlords"("userId");

-- CreateIndex
CREATE INDEX "idx_landlord_email" ON "landlords"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");

-- CreateIndex
CREATE INDEX "idx_tenant_email" ON "tenants"("email");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "users"("email");

-- AddForeignKey
ALTER TABLE "landlords" ADD CONSTRAINT "landlords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

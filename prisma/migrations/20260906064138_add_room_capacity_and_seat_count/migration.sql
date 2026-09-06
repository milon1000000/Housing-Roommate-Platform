-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "seatCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "availableSeats" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1;

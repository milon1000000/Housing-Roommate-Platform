/*
  Warnings:

  - You are about to drop the `roommate_preferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "roommate_preferences" DROP CONSTRAINT "roommate_preferences_userId_fkey";

-- DropTable
DROP TABLE "roommate_preferences";

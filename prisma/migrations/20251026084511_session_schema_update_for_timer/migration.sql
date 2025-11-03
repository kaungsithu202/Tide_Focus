/*
  Warnings:

  - You are about to drop the column `breakDurationSeconds` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `iterationCount` on the `session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `session` DROP COLUMN `breakDurationSeconds`,
    DROP COLUMN `iterationCount`;

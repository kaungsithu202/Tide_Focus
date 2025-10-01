/*
  Warnings:

  - Changed the type of `expirationTime` on the `userinvalidtoken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `userinvalidtoken` DROP COLUMN `expirationTime`,
    ADD COLUMN `expirationTime` INTEGER NOT NULL;

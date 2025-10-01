/*
  Warnings:

  - You are about to drop the column `TwoFAEnable` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `TwoFASecret` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `TwoFAEnable`,
    DROP COLUMN `TwoFASecret`,
    ADD COLUMN `twoFAEnable` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFASecret` VARCHAR(191) NULL;

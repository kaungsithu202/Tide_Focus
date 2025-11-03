/*
  Warnings:

  - Made the column `categoryId` on table `session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `Session_categoryId_fkey`;

-- DropIndex
DROP INDEX `Session_categoryId_fkey` ON `session`;

-- AlterTable
ALTER TABLE `session` MODIFY `categoryId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

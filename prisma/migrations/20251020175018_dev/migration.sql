-- DropForeignKey
ALTER TABLE `session` DROP FOREIGN KEY `Session_categoryId_fkey`;

-- DropIndex
DROP INDEX `Session_categoryId_fkey` ON `session`;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

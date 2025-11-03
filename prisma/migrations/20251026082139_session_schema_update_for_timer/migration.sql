-- AlterTable
ALTER TABLE `session` ADD COLUMN `breakDurationSeconds` INTEGER NULL,
    ADD COLUMN `iterationCount` INTEGER NULL,
    MODIFY `categoryId` INTEGER NULL;

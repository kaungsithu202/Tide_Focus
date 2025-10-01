/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `RefreshToken_refreshToken_key` ON `RefreshToken`(`refreshToken`);

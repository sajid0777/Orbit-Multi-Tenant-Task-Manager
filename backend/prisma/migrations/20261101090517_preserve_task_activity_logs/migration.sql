-- DropForeignKey
ALTER TABLE `activitylog` DROP FOREIGN KEY `ActivityLog_taskId_fkey`;

-- AlterTable
ALTER TABLE `activitylog` MODIFY `taskId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

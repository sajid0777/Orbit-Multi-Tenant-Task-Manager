-- Additive migration: preserves existing organizations, projects, tasks and activity logs.
CREATE TABLE `Tenant` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Tenant_organizationId_slug_key` (`organizationId`, `slug`),
  INDEX `Tenant_organizationId_idx` (`organizationId`),
  CONSTRAINT `Tenant_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TenantMembership` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('TENANT_ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TenantMembership_tenantId_userId_key` (`tenantId`, `userId`),
  INDEX `TenantMembership_userId_idx` (`userId`),
  CONSTRAINT `TenantMembership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TenantMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Project` ADD COLUMN `tenantId` VARCHAR(191) NULL;
CREATE INDEX `Project_tenantId_idx` ON `Project` (`tenantId`);
ALTER TABLE `Project` ADD CONSTRAINT `Project_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `Board` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `Board_projectId_key` (`projectId`),
  INDEX `Board_organizationId_tenantId_idx` (`organizationId`, `tenantId`),
  CONSTRAINT `Board_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Board_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Board_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BoardColumn` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `boardId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `BoardColumn_boardId_position_key` (`boardId`, `position`),
  INDEX `BoardColumn_boardId_idx` (`boardId`),
  CONSTRAINT `BoardColumn_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Task` ADD COLUMN `boardId` VARCHAR(191) NULL, ADD COLUMN `columnId` VARCHAR(191) NULL;
CREATE INDEX `Task_boardId_columnId_position_idx` ON `Task` (`boardId`, `columnId`, `position`);
ALTER TABLE `Task` ADD CONSTRAINT `Task_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Task` ADD CONSTRAINT `Task_columnId_fkey` FOREIGN KEY (`columnId`) REFERENCES `BoardColumn` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

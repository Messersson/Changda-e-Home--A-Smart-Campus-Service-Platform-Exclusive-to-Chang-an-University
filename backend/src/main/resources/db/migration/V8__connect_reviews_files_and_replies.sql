SET @schema_name = DATABASE();

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'study_materials' AND COLUMN_NAME = 'file_name');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE study_materials ADD COLUMN file_name VARCHAR(255) NULL AFTER size', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'study_materials' AND COLUMN_NAME = 'file_content_type');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE study_materials ADD COLUMN file_content_type VARCHAR(128) NULL AFTER file_name', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'study_materials' AND COLUMN_NAME = 'file_size');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE study_materials ADD COLUMN file_size BIGINT NULL AFTER file_content_type', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'study_materials' AND COLUMN_NAME = 'file_content');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE study_materials ADD COLUMN file_content LONGBLOB NULL AFTER file_size', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'driving_inquiries' AND COLUMN_NAME = 'reply');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE driving_inquiries ADD COLUMN reply TEXT NULL AFTER question', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'driving_inquiries' AND COLUMN_NAME = 'replied_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE driving_inquiries ADD COLUMN replied_at DATETIME NULL AFTER reply', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

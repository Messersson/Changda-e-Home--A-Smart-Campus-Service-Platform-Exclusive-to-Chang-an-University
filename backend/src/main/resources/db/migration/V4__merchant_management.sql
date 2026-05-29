SET @schema_name = DATABASE();

ALTER TABLE users MODIFY COLUMN student_id VARCHAR(100) NOT NULL COMMENT 'login account or student number';
ALTER TABLE email_verifications MODIFY COLUMN student_id VARCHAR(100) NOT NULL;
ALTER TABLE login_attempts MODIFY COLUMN student_id VARCHAR(100) NOT NULL;

CREATE TABLE IF NOT EXISTS merchant_applications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  store_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(50) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  audit_remark VARCHAR(255) NULL,
  auditor_id BIGINT NULL,
  audited_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_merchant_applications_user (user_id),
  INDEX idx_merchant_applications_status (status),
  INDEX idx_merchant_applications_email (email),
  CONSTRAINT fk_merchant_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS merchant_profiles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  application_id BIGINT NULL,
  store_name VARCHAR(100) NOT NULL,
  contact_name VARCHAR(50) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(20) DEFAULT 'active',
  approved_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_merchant_profiles_user (user_id),
  INDEX idx_merchant_profiles_status (status),
  INDEX idx_merchant_profiles_store (store_name),
  CONSTRAINT fk_merchant_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_after_sales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  merchant_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NULL,
  status VARCHAR(30) DEFAULT 'pending',
  merchant_reply VARCHAR(255) NULL,
  merchant_handled_at DATETIME NULL,
  admin_reply VARCHAR(255) NULL,
  admin_handled_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_after_sales_order (order_id),
  INDEX idx_order_after_sales_user (user_id),
  INDEX idx_order_after_sales_merchant (merchant_id),
  INDEX idx_order_after_sales_status (status),
  CONSTRAINT fk_order_after_sales_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_after_sales_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_after_sales_merchant FOREIGN KEY (merchant_id) REFERENCES merchant_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'snacks' AND COLUMN_NAME = 'merchant_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE snacks ADD COLUMN merchant_id BIGINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'supermarket_products' AND COLUMN_NAME = 'merchant_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE supermarket_products ADD COLUMN merchant_id BIGINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'merchant_id');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN merchant_id BIGINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'snacks' AND INDEX_NAME = 'idx_snacks_merchant_id');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE snacks ADD INDEX idx_snacks_merchant_id (merchant_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'supermarket_products' AND INDEX_NAME = 'idx_supermarket_products_merchant_id');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE supermarket_products ADD INDEX idx_supermarket_products_merchant_id (merchant_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_orders_merchant_id');
SET @sql = IF(@index_exists = 0, 'ALTER TABLE orders ADD INDEX idx_orders_merchant_id (merchant_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

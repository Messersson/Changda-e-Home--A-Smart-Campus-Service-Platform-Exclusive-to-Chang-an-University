CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  provider VARCHAR(20) NOT NULL,
  out_trade_no VARCHAR(80) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'created',
  pay_url VARCHAR(512),
  notify_payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  UNIQUE KEY uk_payments_out_trade_no (out_trade_no),
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  provider VARCHAR(20) NOT NULL,
  out_refund_no VARCHAR(80) NOT NULL,
  refund_no VARCHAR(128),
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  status VARCHAR(20) DEFAULT 'created',
  raw_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  refunded_at DATETIME NULL,
  UNIQUE KEY uk_refunds_out_refund_no (out_refund_no),
  INDEX idx_refunds_payment (payment_id),
  INDEX idx_refunds_order (order_id),
  INDEX idx_refunds_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  order_id INT NULL,
  movement_type VARCHAR(32) NOT NULL,
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id INT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_product (product_id),
  INDEX idx_stock_movements_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id INT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_status_logs_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id INT NULL,
  target_type VARCHAR(64) NULL,
  target_id VARCHAR(64) NULL,
  details JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(20) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_student (student_id),
  INDEX idx_login_attempts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @schema_name = DATABASE();

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'users' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_no');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN order_no VARCHAR(40) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'idempotency_key');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(80) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_status');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT ''unpaid''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'cancel_reason');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN cancel_reason VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'paid_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'snacks' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE snacks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'supermarket_categories' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE supermarket_categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'supermarket_products' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE supermarket_products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'tutors' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE tutors ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'secondhand_items' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE secondhand_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'driving_schools' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE driving_schools ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'driving_inquiries' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE driving_inquiries ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'study_materials' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE study_materials ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'forum_posts' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE forum_posts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

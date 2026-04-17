ALTER TABLE orders
  ADD COLUMN order_no VARCHAR(32) NULL COMMENT '业务订单号',
  ADD COLUMN idempotency_key VARCHAR(64) NULL COMMENT '幂等键',
  ADD COLUMN cancel_reason VARCHAR(255) NULL COMMENT '取消原因',
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD UNIQUE KEY uk_orders_order_no (order_no),
  ADD UNIQUE KEY uk_orders_idempotency_key (idempotency_key);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刷新令牌表';

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(20) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_attempts_student_id (student_id),
  INDEX idx_login_attempts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录尝试记录';

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  order_id INT NULL,
  movement_type VARCHAR(32) NOT NULL COMMENT 'reserve/release/adjust',
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id INT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_product_id (product_id),
  INDEX idx_stock_movements_order_id (order_id),
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES supermarket_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存流水';

CREATE TABLE IF NOT EXISTS order_status_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id INT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_status_logs_order_id (order_id),
  CONSTRAINT fk_order_status_logs_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单状态流转日志';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志';

-- 2026-04-30 支付功能基础表结构
-- 用于已有数据库的增量升级（新部署仍以 init.sql 为准）

ALTER TABLE orders
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '支付状态: unpaid/paid/refunded' AFTER status,
  ADD COLUMN paid_at DATETIME NULL COMMENT '支付时间' AFTER payment_status,
  ADD INDEX idx_payment_status (payment_status);

CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL COMMENT '订单ID',
  user_id INT NOT NULL COMMENT '用户ID',
  provider VARCHAR(20) NOT NULL COMMENT '支付渠道: mock/wechat/alipay',
  out_trade_no VARCHAR(64) NOT NULL COMMENT '商户订单号',
  amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
  status VARCHAR(20) DEFAULT 'created' COMMENT '状态: created/paid/closed/failed',
  pay_url VARCHAR(512) COMMENT '支付链接',
  notify_payload TEXT COMMENT '回调原始数据',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  paid_at DATETIME NULL COMMENT '支付时间',
  UNIQUE KEY uk_out_trade_no (out_trade_no),
  INDEX idx_payments_order_id (order_id),
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_status (status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

CREATE TABLE IF NOT EXISTS refunds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL COMMENT '支付单ID',
  order_id INT NOT NULL COMMENT '订单ID',
  user_id INT NOT NULL COMMENT '用户ID',
  provider VARCHAR(20) NOT NULL COMMENT '渠道: wechat/alipay/mock',
  out_refund_no VARCHAR(64) NOT NULL COMMENT '商户退款单号',
  refund_no VARCHAR(128) COMMENT '三方退款单号',
  amount DECIMAL(10,2) NOT NULL COMMENT '退款金额',
  reason VARCHAR(255) COMMENT '退款原因',
  status VARCHAR(20) DEFAULT 'created' COMMENT '状态: created/success/closed/failed',
  raw_response TEXT COMMENT '渠道响应',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  refunded_at DATETIME NULL COMMENT '退款时间',
  UNIQUE KEY uk_out_refund_no (out_refund_no),
  INDEX idx_refunds_payment_id (payment_id),
  INDEX idx_refunds_order_id (order_id),
  INDEX idx_refunds_user_id (user_id),
  INDEX idx_refunds_status (status),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';

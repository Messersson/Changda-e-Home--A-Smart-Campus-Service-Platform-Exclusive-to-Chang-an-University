CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'student number',
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL,
  major VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  role VARCHAR(20) DEFAULT 'student',
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_student_id (student_id),
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL,
  student_id VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expiry_time DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_verifications_lookup (email, student_id, code),
  INDEX idx_email_verifications_expiry (expiry_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snacks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  merchant VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_snacks_status (status),
  INDEX idx_snacks_merchant (merchant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supermarket_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(40) NOT NULL,
  parent_id BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supermarket_categories_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supermarket_products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  category_id BIGINT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  spec VARCHAR(50) NOT NULL,
  stock INT DEFAULT 0,
  image VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supermarket_products_category (category_id),
  INDEX idx_supermarket_products_status (status),
  CONSTRAINT fk_supermarket_products_category FOREIGN KEY (category_id) REFERENCES supermarket_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_cart_user_product (user_id, product_id),
  INDEX idx_cart_items_user (user_id),
  CONSTRAINT fk_cart_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES supermarket_products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(40) UNIQUE NULL,
  idempotency_key VARCHAR(80) UNIQUE NULL,
  user_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  items JSON NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(30),
  remark TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  cancel_reason VARCHAR(255) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_type (type),
  INDEX idx_orders_status (status),
  INDEX idx_orders_payment_status (payment_status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
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
  INDEX idx_payments_status (status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
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
  INDEX idx_refunds_user (user_id),
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_refunds_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tutors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(50) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  salary INT NOT NULL,
  description TEXT,
  contact VARCHAR(80) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tutors_user (user_id),
  INDEX idx_tutors_status (status),
  CONSTRAINT fk_tutors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS secondhand_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  images JSON NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_secondhand_user (user_id),
  INDEX idx_secondhand_status (status),
  CONSTRAINT fk_secondhand_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  item_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_favorites_item (user_id, type, item_id),
  INDEX idx_user_favorites_user (user_id),
  CONSTRAINT fk_user_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS driving_schools (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  price INT NOT NULL,
  description TEXT,
  features JSON NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_driving_schools_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS driving_inquiries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  school_id BIGINT NOT NULL,
  name VARCHAR(50),
  phone VARCHAR(30),
  question TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_driving_inquiries_user (user_id),
  INDEX idx_driving_inquiries_school (school_id),
  INDEX idx_driving_inquiries_status (status),
  CONSTRAINT fk_driving_inquiries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_driving_inquiries_school FOREIGN KEY (school_id) REFERENCES driving_schools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_materials (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  major VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  size VARCHAR(20) NOT NULL,
  download_count INT DEFAULT 0,
  uploader_id BIGINT NOT NULL,
  uploader_name VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_study_materials_uploader (uploader_id),
  INDEX idx_study_materials_status (status),
  CONSTRAINT fk_study_materials_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(30) NOT NULL,
  images JSON NULL,
  likes INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_forum_posts_user (user_id),
  INDEX idx_forum_posts_category (category),
  INDEX idx_forum_posts_status (status),
  CONSTRAINT fk_forum_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forum_comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_forum_comments_post (post_id),
  INDEX idx_forum_comments_user (user_id),
  CONSTRAINT fk_forum_comments_post FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_forum_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  order_id BIGINT NULL,
  movement_type VARCHAR(32) NOT NULL,
  quantity INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id BIGINT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_movements_product (product_id),
  INDEX idx_stock_movements_order (order_id),
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES supermarket_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id BIGINT NULL,
  remark VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_status_logs_order (order_id),
  CONSTRAINT fk_order_status_logs_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  operator_type VARCHAR(32) NOT NULL DEFAULT 'system',
  operator_id BIGINT NULL,
  target_type VARCHAR(64) NULL,
  target_id VARCHAR(64) NULL,
  details JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_module (module),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO users (id, student_id, email, password, name, major, grade, role, status) VALUES
  (1, '2024000000', 'admin@chd.edu.cn', 'admin123', '管理员', '系统管理', '2024', 'admin', 'active'),
  (2, '2022000001', 'student@chd.edu.cn', '123456', '测试学生', '软件工程', '2022', 'student', 'active');

INSERT IGNORE INTO supermarket_categories (id, name, icon, parent_id) VALUES
  (1, '零食', 'snack', NULL),
  (2, '水果', 'fruit', NULL),
  (3, '饮料', 'drink', NULL),
  (4, '膨化食品', 'chips', 1),
  (5, '糖果巧克力', 'candy', 1),
  (6, '坚果蜜饯', 'nut', 1),
  (7, '时令水果', 'apple', 2),
  (8, '果汁饮料', 'juice', 3),
  (9, '碳酸饮料', 'soda', 3),
  (10, '茶饮咖啡', 'tea', 3);

INSERT IGNORE INTO supermarket_products (id, name, category_id, price, spec, stock, image, description, status) VALUES
  (1, '乐事薯片原味', 4, 8.50, '70g', 50, '/uploads/supermarket1.jpg', '经典原味薯片', 'active'),
  (2, '奥利奥饼干', 4, 12.00, '133g', 35, '/uploads/supermarket2.jpg', '经典夹心饼干', 'active'),
  (3, '德芙巧克力', 5, 15.00, '80g', 28, '/uploads/supermarket3.jpg', '丝滑牛奶巧克力', 'active'),
  (4, '苹果', 7, 5.50, '500g', 60, '/uploads/supermarket6.jpg', '新鲜红富士苹果', 'active'),
  (5, '香蕉', 7, 4.00, '500g', 45, '/uploads/supermarket7.jpg', '新鲜香蕉', 'active'),
  (6, '可口可乐', 9, 3.00, '330ml', 100, '/uploads/supermarket10.jpg', '经典可乐', 'active'),
  (7, '农夫山泉', 8, 2.00, '550ml', 120, '/uploads/supermarket13.jpg', '天然饮用水', 'active');

INSERT IGNORE INTO snacks (id, name, price, description, image, merchant, status) VALUES
  (1, '肉夹馍', 8.00, '陕西特色肉夹馍', '/uploads/snack1.jpg', '东门老王小吃', 'active'),
  (2, '凉皮', 6.00, '酸辣爽口凉皮', '/uploads/snack2.jpg', '东门老王小吃', 'active'),
  (3, '煎饼果子', 7.00, '现做煎饼，加蛋加脆', '/uploads/snack3.jpg', '东门煎饼摊', 'active'),
  (4, '烤冷面', 8.00, '东北特色烤冷面', '/uploads/snack4.jpg', '东门烤冷面', 'active'),
  (5, '炸串', 2.00, '蔬菜肉类按串计价', '/uploads/snack5.jpg', '东门炸串摊', 'active');

INSERT IGNORE INTO driving_schools (id, name, address, phone, price, description, features, status) VALUES
  (1, '长安驾校', '长安大学北门对面', '029-88888888', 2800, '校内合作驾校，通过率高', JSON_ARRAY('包过班', '周末练车', '校内接送'), 'active'),
  (2, '平安驾校', '长安大学南门500米', '029-66666666', 2600, '老牌驾校，教练经验丰富', JSON_ARRAY('一对一教学', '练车时间灵活'), 'active');

INSERT IGNORE INTO tutors (id, user_id, name, subject, grade, salary, description, contact, status) VALUES
  (1, 2, '测试学生', '高等数学', '大一', 60, '擅长高数基础辅导和考前复习', 'student@chd.edu.cn', 'active');

INSERT IGNORE INTO secondhand_items (id, user_id, title, category, price, description, images, status) VALUES
  (1, 2, '九成新计算器', '学习用品', 35.00, '考试可用，功能完好', JSON_ARRAY('/uploads/secondhand1.jpg'), 'active');

INSERT IGNORE INTO study_materials (id, title, major, grade, subject, type, size, download_count, uploader_id, uploader_name, description, status) VALUES
  (1, 'Java Web 复习资料', '软件工程', '2022', 'Java', 'pdf', '3MB', 12, 2, '测试学生', 'Spring Boot 和 Web 基础复习资料', 'active');

INSERT IGNORE INTO forum_posts (id, user_id, user_name, title, content, category, images, likes, status) VALUES
  (1, 2, '测试学生', '校园服务平台上线啦', '欢迎大家体验并反馈问题。', 'life', JSON_ARRAY(), 3, 'active');

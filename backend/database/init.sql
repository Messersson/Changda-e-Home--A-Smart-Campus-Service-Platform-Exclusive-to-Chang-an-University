-- 长安大学校园服务平台数据库初始化脚本
-- 数据库: chd_campus
-- 字符集: utf8mb4

-- 创建数据库
CREATE DATABASE IF NOT EXISTS chd_campus DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE chd_campus;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id VARCHAR(20) UNIQUE NOT NULL COMMENT '学号',
  email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  major VARCHAR(100) NOT NULL COMMENT '专业',
  grade VARCHAR(20) NOT NULL COMMENT '年级',
  role VARCHAR(20) DEFAULT 'student' COMMENT '角色: student/admin',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_student_id (student_id),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 邮箱验证表
CREATE TABLE IF NOT EXISTS email_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  student_id VARCHAR(20) NOT NULL COMMENT '学号',
  code VARCHAR(10) NOT NULL COMMENT '验证码',
  expiry_time DATETIME NOT NULL COMMENT '过期时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_email_student (email, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮箱验证表';

-- 小吃摊菜品表
CREATE TABLE IF NOT EXISTS snacks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '菜品名称',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  description TEXT COMMENT '描述',
  image VARCHAR(255) COMMENT '图片路径',
  merchant VARCHAR(100) NOT NULL COMMENT '商家名称',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小吃摊菜品表';

-- 超市商品分类表
CREATE TABLE IF NOT EXISTS supermarket_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '分类名称',
  icon VARCHAR(10) NOT NULL COMMENT '图标',
  parent_id INT COMMENT '父分类ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='超市商品分类表';

-- 超市商品表
CREATE TABLE IF NOT EXISTS supermarket_products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '商品名称',
  category_id INT NOT NULL COMMENT '分类ID',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  spec VARCHAR(50) NOT NULL COMMENT '规格',
  stock INT DEFAULT 0 COMMENT '库存',
  image VARCHAR(255) COMMENT '图片路径',
  description TEXT COMMENT '描述',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (category_id) REFERENCES supermarket_categories(id) ON DELETE CASCADE,
  INDEX idx_category_id (category_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='超市商品表';

-- 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  product_id INT NOT NULL COMMENT '商品ID',
  quantity INT DEFAULT 1 COMMENT '数量',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES supermarket_products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车表';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  type VARCHAR(20) NOT NULL COMMENT '订单类型: snack/supermarket',
  items TEXT NOT NULL COMMENT '订单商品JSON',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
  address VARCHAR(255) COMMENT '配送地址',
  phone VARCHAR(20) COMMENT '联系电话',
  remark TEXT COMMENT '备注',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/completed/cancelled',
  payment_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '支付状态: unpaid/paid/refunded',
  paid_at DATETIME NULL COMMENT '支付时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 支付记录表（可扩展对接微信/支付宝等）
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

-- 退款记录表
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

-- 家教信息表
CREATE TABLE IF NOT EXISTS tutors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  subject VARCHAR(50) NOT NULL COMMENT '科目',
  grade VARCHAR(20) NOT NULL COMMENT '年级',
  salary INT NOT NULL COMMENT '时薪',
  description TEXT COMMENT '描述',
  contact VARCHAR(50) NOT NULL COMMENT '联系方式',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/active/inactive',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家教信息表';

-- 二手商品表
CREATE TABLE IF NOT EXISTS secondhand_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  title VARCHAR(100) NOT NULL COMMENT '标题',
  category VARCHAR(50) NOT NULL COMMENT '分类',
  price DECIMAL(10,2) NOT NULL COMMENT '价格',
  description TEXT COMMENT '描述',
  images TEXT COMMENT '图片JSON数组',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/active/sold',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='二手商品表';

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  type VARCHAR(20) NOT NULL COMMENT '收藏类型: secondhand/tutor',
  item_id INT NOT NULL COMMENT '项目ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_type_item (user_id, type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';

-- 驾校表
CREATE TABLE IF NOT EXISTS driving_schools (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '驾校名称',
  address VARCHAR(255) NOT NULL COMMENT '地址',
  phone VARCHAR(20) NOT NULL COMMENT '联系电话',
  price INT NOT NULL COMMENT '价格',
  description TEXT COMMENT '描述',
  features TEXT COMMENT '特色JSON数组',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='驾校表';

-- 驾校咨询表
CREATE TABLE IF NOT EXISTS driving_inquiries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  school_id INT NOT NULL COMMENT '驾校ID',
  name VARCHAR(50) COMMENT '姓名',
  phone VARCHAR(20) COMMENT '联系电话',
  question TEXT COMMENT '咨询内容',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/replied',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES driving_schools(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='驾校咨询表';

-- 学习资料表
CREATE TABLE IF NOT EXISTS study_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL COMMENT '资料标题',
  major VARCHAR(100) NOT NULL COMMENT '专业',
  grade VARCHAR(20) NOT NULL COMMENT '年级',
  subject VARCHAR(50) NOT NULL COMMENT '学科',
  type VARCHAR(20) NOT NULL COMMENT '文件类型',
  size VARCHAR(20) NOT NULL COMMENT '文件大小',
  download_count INT DEFAULT 0 COMMENT '下载次数',
  uploader_id INT NOT NULL COMMENT '上传者ID',
  uploader_name VARCHAR(50) NOT NULL COMMENT '上传者姓名',
  description TEXT COMMENT '描述',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习资料表';

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS forum_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  user_name VARCHAR(50) NOT NULL COMMENT '用户姓名',
  title VARCHAR(200) NOT NULL COMMENT '标题',
  content TEXT NOT NULL COMMENT '内容',
  category VARCHAR(20) NOT NULL COMMENT '分类',
  images TEXT COMMENT '图片JSON数组',
  likes INT DEFAULT 0 COMMENT '点赞数',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='论坛帖子表';

-- 论坛评论表
CREATE TABLE IF NOT EXISTS forum_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL COMMENT '帖子ID',
  user_id INT NOT NULL COMMENT '用户ID',
  user_name VARCHAR(50) NOT NULL COMMENT '用户姓名',
  content TEXT NOT NULL COMMENT '评论内容',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='论坛评论表';

-- 插入初始管理员账号（遇到重复键则忽略）
INSERT IGNORE INTO users (student_id, email, password, name, major, grade, role, status) VALUES
('2024000000', 'admin@chd.edu.cn', 'admin123', '管理员', '系统管理', '', 'admin', 'active');

-- 插入初始商品分类（遇到重复键则忽略）
INSERT IGNORE INTO supermarket_categories (name, icon, parent_id) VALUES
('零食', '🍪', NULL),
('水果', '🍎', NULL),
('饮料', '🥤', NULL),
('膨化食品', '🥨', 1),
('糖果巧克力', '🍬', 1),
('坚果蜜饯', '🥜', 1),
('时令水果', '🍇', 2),
('果汁饮料', '🧃', 3),
('碳酸饮料', '🥤', 3),
('茶饮咖啡', '☕', 3);

-- 插入初始商品（遇到重复键则忽略）
INSERT IGNORE INTO supermarket_products (name, category_id, price, spec, stock, image, description, status) VALUES
('乐事薯片原味', 4, 8.50, '70g', 50, '/uploads/supermarket1.jpg', '经典原味薯片', 'active'),
('奥利奥饼干', 4, 12.00, '133g', 35, '/uploads/supermarket2.jpg', '经典夹心饼干', 'active'),
('德芙巧克力', 5, 15.00, '80g', 28, '/uploads/supermarket3.jpg', '丝滑牛奶巧克力', 'active'),
('旺旺雪饼', 4, 6.50, '100g', 42, '/uploads/supermarket4.jpg', '香甜雪饼', 'active'),
('洽洽瓜子', 6, 9.00, '200g', 30, '/uploads/supermarket5.jpg', '原味香瓜子', 'active'),
('苹果', 7, 5.50, '500g', 60, '/uploads/supermarket6.jpg', '新鲜红富士苹果', 'active'),
('香蕉', 7, 4.00, '500g', 45, '/uploads/supermarket7.jpg', '进口香蕉', 'active'),
('橙子', 7, 6.00, '500g', 38, '/uploads/supermarket8.jpg', '赣南脐橙', 'active'),
('葡萄', 7, 12.00, '500g', 25, '/uploads/supermarket9.jpg', '巨峰葡萄', 'active'),
('可口可乐', 9, 3.00, '330ml', 100, '/uploads/supermarket10.jpg', '经典可乐', 'active'),
('雪碧', 9, 3.00, '330ml', 95, '/uploads/supermarket11.jpg', '清爽雪碧', 'active'),
('美汁源橙汁', 8, 5.00, '450ml', 55, '/uploads/supermarket12.jpg', '100%橙汁', 'active'),
('农夫山泉', 8, 2.00, '550ml', 120, '/uploads/supermarket13.jpg', '天然矿泉水', 'active'),
('统一冰红茶', 10, 3.50, '500ml', 80, '/uploads/supermarket14.jpg', '冰爽茶饮', 'active'),
('雀巢咖啡', 10, 4.50, '268ml', 45, '/uploads/supermarket15.jpg', '即饮咖啡', 'active');

-- 插入初始小吃摊菜品
INSERT IGNORE INTO snacks (name, price, description, image, merchant, status) VALUES
('肉夹馍', 8.00, '正宗陕西肉夹馍，肥而不腻', '/uploads/snack1.jpg', '东门老王肉夹馍', 'active'),
('凉皮', 6.00, '西安特色凉皮，酸辣爽口', '/uploads/snack2.jpg', '东门老王肉夹馍', 'active'),
('煎饼果子', 7.00, '现做煎饼，加蛋加肠', '/uploads/snack3.jpg', '东门煎饼摊', 'active'),
('烤冷面', 8.00, '东北特色烤冷面，酸甜可口', '/uploads/snack4.jpg', '东门烤冷面', 'active'),
('炸串', 2.00, '各种蔬菜肉类炸串，按串计价', '/uploads/snack5.jpg', '东门炸串摊', 'active');

-- 插入初始驾校
INSERT IGNORE INTO driving_schools (name, address, phone, price, description, features, status) VALUES
('长安驾校', '长安大学北门对面', '029-88888888', 2800, '校内合作驾校，通过率高', '["包过班", "周末练车", "校内接送"]', 'active'),
('平安驾校', '长安大学南门500米', '029-66666666', 2600, '老牌驾校，教练经验丰富', '["一对一教学", "练车时间灵活"]', 'active');

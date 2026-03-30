/*
 Navicat Premium Dump SQL

 Source Server         : 长安大学服务平台数据库
 Source Server Type    : MySQL
 Source Server Version : 90001 (9.0.1)
 Source Host           : localhost:3306
 Source Schema         : changan_campus_service

 Target Server Type    : MySQL
 Target Server Version : 90001 (9.0.1)
 File Encoding         : 65001

 Date: 23/03/2026 21:39:38
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for audit_record
-- ----------------------------
DROP TABLE IF EXISTS `audit_record`;
CREATE TABLE `audit_record`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '审核记录ID，自增主键',
  `module_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '审核模块类型：tutoring-家教，secondhand-二手商品，study_material-学习资料',
  `record_id` int UNSIGNED NOT NULL COMMENT '被审核记录ID，关联对应模块表的主键ID',
  `old_status` tinyint NOT NULL COMMENT '原审核状态',
  `new_status` tinyint NOT NULL COMMENT '新审核状态',
  `auditor_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '审核人学号，必须为admin角色，关联user.student_id',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '审核理由，如拒绝原因、通过备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '审核时间',
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_module_record`(`module_type` ASC, `record_id` ASC) USING BTREE,
  INDEX `idx_auditor_id`(`auditor_id` ASC) USING BTREE,
  INDEX `idx_create_time`(`create_time` ASC) USING BTREE,
  CONSTRAINT `audit_record_ibfk_1` FOREIGN KEY (`auditor_id`) REFERENCES `user` (`student_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '后台审核操作记录表，所有审核行为可追溯' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of audit_record
-- ----------------------------

-- ----------------------------
-- Table structure for driving_school
-- ----------------------------
DROP TABLE IF EXISTS `driving_school`;
CREATE TABLE `driving_school`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '驾校ID，自增主键',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '驾校名称，如长安驾校、鹏程驾校',
  `logo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '驾校Logo URL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '驾校简介，如训练场地、拿证时间、收费标准',
  `registration_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '报名链接，支持校内专属报名入口',
  `contact_info` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '咨询联系方式，如驾校老师手机号、微信',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否有效：0-无效（下架），1-有效（上架）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_is_active`(`is_active` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '驾校信息表，后台管理可增删改查' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of driving_school
-- ----------------------------

-- ----------------------------
-- Table structure for forum_board
-- ----------------------------
DROP TABLE IF EXISTS `forum_board`;
CREATE TABLE `forum_board`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '板块ID，自增主键',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '板块名称，如学习交流、校园生活、闲置交易、驾校咨询',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '板块描述，如分享学习心得、交流校园日常',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号，数字越小越靠前',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用：0-禁用，1-启用',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_is_active`(`is_active` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '校园论坛板块表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of forum_board
-- ----------------------------

-- ----------------------------
-- Table structure for forum_comment
-- ----------------------------
DROP TABLE IF EXISTS `forum_comment`;
CREATE TABLE `forum_comment`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评论ID，自增主键',
  `post_id` int UNSIGNED NOT NULL COMMENT '帖子ID，关联forum_post.id',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论人学号，关联user.student_id',
  `parent_id` int UNSIGNED NULL DEFAULT NULL COMMENT '父评论ID，楼中楼用，关联本表id，顶级评论为NULL',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论内容',
  `like_count` int NOT NULL DEFAULT 0 COMMENT '评论点赞次数',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_post_id`(`post_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_parent_id`(`parent_id` ASC) USING BTREE,
  CONSTRAINT `forum_comment_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `forum_post` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `forum_comment_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '论坛评论表，支持楼中楼回复' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of forum_comment
-- ----------------------------

-- ----------------------------
-- Table structure for forum_like
-- ----------------------------
DROP TABLE IF EXISTS `forum_like`;
CREATE TABLE `forum_like`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点赞ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '点赞人学号，关联user.student_id',
  `target_type` enum('post','comment') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '点赞目标类型：post-帖子，comment-评论',
  `target_id` int UNSIGNED NOT NULL COMMENT '目标ID，关联forum_post.id或forum_comment.id',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_target`(`user_id` ASC, `target_type` ASC, `target_id` ASC) USING BTREE,
  INDEX `idx_target`(`target_type` ASC, `target_id` ASC) USING BTREE,
  CONSTRAINT `forum_like_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '论坛点赞表，帖子和评论通用' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of forum_like
-- ----------------------------

-- ----------------------------
-- Table structure for forum_post
-- ----------------------------
DROP TABLE IF EXISTS `forum_post`;
CREATE TABLE `forum_post`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '帖子ID，自增主键',
  `board_id` int UNSIGNED NOT NULL COMMENT '板块ID，关联forum_board.id',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发帖人学号，关联user.student_id',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '帖子标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '帖子内容，支持图文混排',
  `image_urls` json NULL COMMENT '帖子图片URL列表，JSON数组格式',
  `view_count` int NOT NULL DEFAULT 0 COMMENT '浏览次数，自动统计',
  `like_count` int NOT NULL DEFAULT 0 COMMENT '点赞次数，自动统计',
  `comment_count` int NOT NULL DEFAULT 0 COMMENT '评论次数，自动统计',
  `is_top` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否置顶：0-否，1-是，后台管理员设置',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_board_id`(`board_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_create_time`(`create_time` ASC) USING BTREE,
  INDEX `idx_is_top`(`is_top` ASC) USING BTREE,
  CONSTRAINT `forum_post_ibfk_1` FOREIGN KEY (`board_id`) REFERENCES `forum_board` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `forum_post_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '校园论坛帖子表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of forum_post
-- ----------------------------

-- ----------------------------
-- Table structure for operation_log
-- ----------------------------
DROP TABLE IF EXISTS `operation_log`;
CREATE TABLE `operation_log`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID，自增主键（用BIGINT避免数据量过大溢出）',
  `operator_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作人学号，admin角色，关联user.student_id',
  `operation_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型：ADD-新增，UPDATE-修改，DELETE-删除，QUERY-查询',
  `target_module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作目标模块：如user-用户管理，supermarket-超市管理',
  `target_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作目标ID，如商品ID、用户学号',
  `details` json NULL COMMENT '操作详情，JSON格式：{\"old_data\":\"旧值\",\"new_data\":\"新值\"}',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '操作人IP地址，记录登录IP',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_operator_id`(`operator_id` ASC) USING BTREE,
  INDEX `idx_operation_type`(`operation_type` ASC) USING BTREE,
  INDEX `idx_target_module`(`target_module` ASC) USING BTREE,
  INDEX `idx_create_time`(`create_time` ASC) USING BTREE,
  CONSTRAINT `operation_log_ibfk_1` FOREIGN KEY (`operator_id`) REFERENCES `user` (`student_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '后台管理员操作日志表，所有操作可追溯，保障数据安全' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of operation_log
-- ----------------------------

-- ----------------------------
-- Table structure for secondhand_favorite
-- ----------------------------
DROP TABLE IF EXISTS `secondhand_favorite`;
CREATE TABLE `secondhand_favorite`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户学号，关联user.student_id',
  `item_id` int UNSIGNED NOT NULL COMMENT '二手商品ID，关联secondhand_item.id',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_item`(`user_id` ASC, `item_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `item_id`(`item_id` ASC) USING BTREE,
  CONSTRAINT `secondhand_favorite_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `secondhand_favorite_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `secondhand_item` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '二手商品收藏表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of secondhand_favorite
-- ----------------------------

-- ----------------------------
-- Table structure for secondhand_item
-- ----------------------------
DROP TABLE IF EXISTS `secondhand_item`;
CREATE TABLE `secondhand_item`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '二手商品ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发布人学号，关联user.student_id',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品标题，如九成新笔记本电脑、大一高数教材',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品分类，如教材、电子产品、生活用品、体育器材',
  `price` decimal(10, 2) NOT NULL COMMENT '商品价格，二手售价',
  `image_urls` json NULL COMMENT '商品图片URL列表，JSON数组格式：[\"url1\",\"url2\"]',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品详情，如使用时长、成色、是否有损坏',
  `audit_status` tinyint NOT NULL DEFAULT 0 COMMENT '审核状态：0-待审核，1-通过，2-拒绝',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_category`(`category` ASC) USING BTREE,
  INDEX `idx_audit_status`(`audit_status` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_price`(`price` ASC) USING BTREE,
  CONSTRAINT `secondhand_item_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '二手商品发布表，需后台审核' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of secondhand_item
-- ----------------------------

-- ----------------------------
-- Table structure for snack_item
-- ----------------------------
DROP TABLE IF EXISTS `snack_item`;
CREATE TABLE `snack_item`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '菜品ID，自增主键',
  `vendor_id` int UNSIGNED NOT NULL COMMENT '商家ID，关联snack_vendor.id',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜品名称，如经典烤冷面、加肠手抓饼',
  `price` decimal(10, 2) NOT NULL COMMENT '菜品单价',
  `image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '菜品图片URL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '菜品描述，如配料、口味',
  `is_on_shelf` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否上架：0-下架，1-上架',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_vendor_shelf`(`vendor_id` ASC, `is_on_shelf` ASC) USING BTREE,
  INDEX `idx_price`(`price` ASC) USING BTREE,
  CONSTRAINT `snack_item_ibfk_1` FOREIGN KEY (`vendor_id`) REFERENCES `snack_vendor` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '东门小吃摊菜品信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of snack_item
-- ----------------------------

-- ----------------------------
-- Table structure for snack_order
-- ----------------------------
DROP TABLE IF EXISTS `snack_order`;
CREATE TABLE `snack_order`  (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID，自定义格式：SN+时间戳，如SN20240615123456',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户学号，关联user.student_id',
  `vendor_id` int UNSIGNED NOT NULL COMMENT '商家ID，关联snack_vendor.id',
  `total_amount` decimal(10, 2) NOT NULL COMMENT '订单总金额',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '订单状态：0-待支付，1-已支付，2-已取消，3-已完成',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '用户备注，如少辣、多酱',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_vendor_id`(`vendor_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  CONSTRAINT `snack_order_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `snack_order_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `snack_vendor` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '东门小吃摊订单主表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of snack_order
-- ----------------------------

-- ----------------------------
-- Table structure for snack_order_item
-- ----------------------------
DROP TABLE IF EXISTS `snack_order_item`;
CREATE TABLE `snack_order_item`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单明细ID，自增主键',
  `order_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID，关联snack_order.id',
  `item_id` int UNSIGNED NOT NULL COMMENT '菜品ID，关联snack_item.id',
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜品名称（冗余存储）',
  `item_price` decimal(10, 2) NOT NULL COMMENT '菜品单价（冗余存储），记录下单时价格',
  `quantity` int NOT NULL COMMENT '购买数量',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_order_id`(`order_id` ASC) USING BTREE,
  INDEX `item_id`(`item_id` ASC) USING BTREE,
  CONSTRAINT `snack_order_item_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `snack_order` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `snack_order_item_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `snack_item` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '东门小吃摊订单明细表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of snack_order_item
-- ----------------------------

-- ----------------------------
-- Table structure for snack_vendor
-- ----------------------------
DROP TABLE IF EXISTS `snack_vendor`;
CREATE TABLE `snack_vendor`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '商家ID，自增主键',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商家名称，如东门烤冷面、手抓饼',
  `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商家位置，如东门左侧1号、东门右侧3号',
  `contact_info` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '商家联系方式，如摊主手机号',
  `business_hours` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '营业时间，如10:00-22:00',
  `logo_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '商家Logo/门头图URL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '商家简介，如特色菜品',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否营业：0-停业，1-营业，后台控制',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_is_active`(`is_active` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '东门小吃摊商家信息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of snack_vendor
-- ----------------------------

-- ----------------------------
-- Table structure for study_material
-- ----------------------------
DROP TABLE IF EXISTS `study_material`;
CREATE TABLE `study_material`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '资料ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上传人学号，关联user.student_id',
  `category_id` int UNSIGNED NOT NULL COMMENT '分类ID，关联study_material_category.id',
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '资料标题，如大一高数期末复习题、C语言课后答案',
  `file_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '资料下载链接，支持云存储链接',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '资料简介，如适用范围、资料类型（真题/课件/笔记）',
  `audit_status` tinyint NOT NULL DEFAULT 0 COMMENT '审核状态：0-待审核，1-通过，2-拒绝',
  `download_count` int NOT NULL DEFAULT 0 COMMENT '资料下载次数，自动统计',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_category_id`(`category_id` ASC) USING BTREE,
  INDEX `idx_audit_status`(`audit_status` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_download_count`(`download_count` ASC) USING BTREE,
  CONSTRAINT `study_material_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `study_material_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `study_material_category` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '学习资料信息表，学生上传后需后台审核' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of study_material
-- ----------------------------

-- ----------------------------
-- Table structure for study_material_category
-- ----------------------------
DROP TABLE IF EXISTS `study_material_category`;
CREATE TABLE `study_material_category`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID，自增主键',
  `major` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '专业名称，如计算机科学与技术、土木工程、会计学',
  `grade` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '年级，如大一、大二、大三、大四',
  `subject` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学科名称，如高等数学、C语言、结构力学',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_major_grade_subject`(`major` ASC, `grade` ASC, `subject` ASC) USING BTREE,
  INDEX `idx_major`(`major` ASC) USING BTREE,
  INDEX `idx_grade`(`grade` ASC) USING BTREE,
  INDEX `idx_subject`(`subject` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '学习资料分类表，按长安大学专业体系划分' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of study_material_category
-- ----------------------------

-- ----------------------------
-- Table structure for supermarket_cart
-- ----------------------------
DROP TABLE IF EXISTS `supermarket_cart`;
CREATE TABLE `supermarket_cart`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '购物车ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户学号，关联user.student_id',
  `item_id` int UNSIGNED NOT NULL COMMENT '商品ID，关联supermarket_item.id',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '购买数量，默认1，可修改',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_user_item`(`user_id` ASC, `item_id` ASC) USING BTREE,
  INDEX `item_id`(`item_id` ASC) USING BTREE,
  CONSTRAINT `supermarket_cart_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `supermarket_cart_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `supermarket_item` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '超市购物车表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of supermarket_cart
-- ----------------------------

-- ----------------------------
-- Table structure for supermarket_category
-- ----------------------------
DROP TABLE IF EXISTS `supermarket_category`;
CREATE TABLE `supermarket_category`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID，自增主键',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称，如零食、碳酸饮料、苹果等',
  `level` tinyint NOT NULL COMMENT '分类层级：1-一级，2-二级，3-三级',
  `parent_id` int UNSIGNED NULL DEFAULT NULL COMMENT '父分类ID，一级分类为NULL，关联本表id',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号，数字越小越靠前',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_parent_level`(`parent_id` ASC, `level` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '超市商品三级分类表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of supermarket_category
-- ----------------------------

-- ----------------------------
-- Table structure for supermarket_item
-- ----------------------------
DROP TABLE IF EXISTS `supermarket_item`;
CREATE TABLE `supermarket_item`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '商品ID，自增主键',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品名称，如可乐500ml、富士苹果500g',
  `category_level1` int UNSIGNED NOT NULL COMMENT '一级分类ID，关联supermarket_category.id',
  `category_level2` int UNSIGNED NOT NULL COMMENT '二级分类ID，关联supermarket_category.id',
  `category_level3` int UNSIGNED NOT NULL COMMENT '三级分类ID，关联supermarket_category.id',
  `price` decimal(10, 2) NOT NULL COMMENT '商品单价，保留2位小数',
  `stock` int NOT NULL DEFAULT 0 COMMENT '商品库存，库存为0时前台自动下架',
  `spec` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '商品规格，如500ml、1kg、整箱等',
  `image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '商品主图URL',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '商品描述，如口味、保质期等',
  `is_on_shelf` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否上架：0-下架，1-上架，后台手动控制',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_category1_shelf`(`category_level1` ASC, `is_on_shelf` ASC) USING BTREE,
  INDEX `idx_category2`(`category_level2` ASC) USING BTREE,
  INDEX `idx_category3`(`category_level3` ASC) USING BTREE,
  INDEX `idx_price`(`price` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '超市商品信息表，存储所有零食/水果/饮料信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of supermarket_item
-- ----------------------------

-- ----------------------------
-- Table structure for supermarket_order
-- ----------------------------
DROP TABLE IF EXISTS `supermarket_order`;
CREATE TABLE `supermarket_order`  (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID，自定义格式：SM+时间戳，如SM20240615123456',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户学号，关联user.student_id',
  `total_amount` decimal(10, 2) NOT NULL COMMENT '订单总金额，商品单价*数量求和',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '订单状态：0-待支付，1-已支付，2-已取消，3-已完成',
  `delivery_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '配送地址，校园内地址',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '用户备注，如尽快配送',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_create_time`(`create_time` ASC) USING BTREE,
  CONSTRAINT `supermarket_order_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '超市订单主表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of supermarket_order
-- ----------------------------

-- ----------------------------
-- Table structure for supermarket_order_item
-- ----------------------------
DROP TABLE IF EXISTS `supermarket_order_item`;
CREATE TABLE `supermarket_order_item`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单明细ID，自增主键',
  `order_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID，关联supermarket_order.id',
  `item_id` int UNSIGNED NOT NULL COMMENT '商品ID，关联supermarket_item.id',
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品名称（冗余存储），避免商品删除后订单无名称',
  `item_price` decimal(10, 2) NOT NULL COMMENT '商品单价（冗余存储），记录下单时的价格',
  `quantity` int NOT NULL COMMENT '购买数量',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_order_id`(`order_id` ASC) USING BTREE,
  INDEX `item_id`(`item_id` ASC) USING BTREE,
  CONSTRAINT `supermarket_order_item_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `supermarket_order` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `supermarket_order_item_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `supermarket_item` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '超市订单明细表，存储订单内具体商品信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of supermarket_order_item
-- ----------------------------

-- ----------------------------
-- Table structure for tutoring_post
-- ----------------------------
DROP TABLE IF EXISTS `tutoring_post`;
CREATE TABLE `tutoring_post`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '家教信息ID，自增主键',
  `user_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发布人学号，关联user.student_id',
  `subject` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '辅导科目，如数学、英语、物理',
  `grade` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '辅导年级，如小学三年级、初中二年级、高中理科',
  `salary` decimal(10, 2) NOT NULL COMMENT '期望薪资，单位：元/小时',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '家教详情，如辅导地点、自身优势、辅导时间',
  `contact_info` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系方式，如手机号、微信',
  `audit_status` tinyint NOT NULL DEFAULT 0 COMMENT '审核状态：0-待审核，1-审核通过，2-审核拒绝',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '审核备注，后台管理员填写',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_subject_grade`(`subject` ASC, `grade` ASC) USING BTREE,
  INDEX `idx_audit_status`(`audit_status` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  CONSTRAINT `tutoring_post_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`student_id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '家教信息发布表，需后台审核后前台展示' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tutoring_post
-- ----------------------------

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `student_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学号，长安大学学号格式，作为唯一主键',
  `edu_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '长安大学教育邮箱，后缀必须为@chd.edu.cn',
  `password` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BCrypt加密后的密码，不可逆加密存储',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户昵称，前台展示用',
  `real_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '真实姓名，可选填',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '手机号，可选填，用于联系',
  `avatar_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '用户头像URL，支持远程链接',
  `is_verified` tinyint(1) NOT NULL DEFAULT 0 COMMENT '邮箱验证状态：0-未验证，1-已验证（未验证不可登录）',
  `account_status` tinyint NOT NULL DEFAULT 1 COMMENT '账号状态：0-禁用，1-正常，2-永久封禁',
  `role` enum('student','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student' COMMENT '用户角色：student-普通学生，admin-后台管理员',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '信息更新时间，自动触发',
  `ext1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '通用拓展字段1，适配后续功能升级',
  `ext2` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '通用拓展字段2，适配后续功能升级',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL COMMENT '备注字段，后台管理员可编辑',
  PRIMARY KEY (`student_id`) USING BTREE,
  UNIQUE INDEX `uk_edu_email`(`edu_email` ASC) USING BTREE,
  INDEX `idx_role`(`role` ASC) USING BTREE,
  INDEX `idx_account_status`(`account_status` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户核心表，存储所有注册用户信息' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of user
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;

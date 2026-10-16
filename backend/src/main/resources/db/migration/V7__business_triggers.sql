DROP TRIGGER IF EXISTS trg_supermarket_products_bi_validate;
DROP TRIGGER IF EXISTS trg_supermarket_products_bu_validate;
DROP TRIGGER IF EXISTS trg_cart_items_bi_validate;
DROP TRIGGER IF EXISTS trg_cart_items_bu_validate;
DROP TRIGGER IF EXISTS trg_orders_bi_defaults;
DROP TRIGGER IF EXISTS trg_orders_au_status_log;
DROP TRIGGER IF EXISTS trg_payments_au_sync_order;
DROP TRIGGER IF EXISTS trg_refunds_ai_sync_payment_order;
DROP TRIGGER IF EXISTS trg_refunds_au_sync_payment_order;
DROP TRIGGER IF EXISTS trg_after_sales_bi_validate;
DROP TRIGGER IF EXISTS trg_after_sales_au_audit;

DELIMITER $$

CREATE TRIGGER trg_supermarket_products_bi_validate
BEFORE INSERT ON supermarket_products
FOR EACH ROW
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product price must be greater than zero';
  END IF;

  IF NEW.stock IS NULL THEN
    SET NEW.stock = 0;
  END IF;

  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product stock cannot be negative';
  END IF;
END$$

CREATE TRIGGER trg_supermarket_products_bu_validate
BEFORE UPDATE ON supermarket_products
FOR EACH ROW
BEGIN
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product price must be greater than zero';
  END IF;

  IF NEW.stock IS NULL THEN
    SET NEW.stock = 0;
  END IF;

  IF NEW.stock < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product stock cannot be negative';
  END IF;
END$$

CREATE TRIGGER trg_cart_items_bi_validate
BEFORE INSERT ON cart_items
FOR EACH ROW
BEGIN
  DECLARE v_product_count INT DEFAULT 0;
  DECLARE v_stock INT DEFAULT 0;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart quantity must be greater than zero';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(stock), 0)
    INTO v_product_count, v_stock
    FROM supermarket_products
    WHERE id = NEW.product_id;

  IF v_product_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart product does not exist';
  END IF;

  IF v_stock < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart quantity exceeds current stock';
  END IF;
END$$

CREATE TRIGGER trg_cart_items_bu_validate
BEFORE UPDATE ON cart_items
FOR EACH ROW
BEGIN
  DECLARE v_product_count INT DEFAULT 0;
  DECLARE v_stock INT DEFAULT 0;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart quantity must be greater than zero';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(stock), 0)
    INTO v_product_count, v_stock
    FROM supermarket_products
    WHERE id = NEW.product_id;

  IF v_product_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart product does not exist';
  END IF;

  IF v_stock < NEW.quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cart quantity exceeds current stock';
  END IF;
END$$

CREATE TRIGGER trg_orders_bi_defaults
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.order_no IS NULL OR TRIM(NEW.order_no) = '' THEN
    SET NEW.order_no = CONCAT(
      'O',
      DATE_FORMAT(CURRENT_TIMESTAMP(6), '%Y%m%d%H%i%s%f'),
      UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 6))
    );
  END IF;

  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order total amount must be greater than zero';
  END IF;

  IF NEW.status IS NULL OR TRIM(NEW.status) = '' THEN
    SET NEW.status = 'pending';
  END IF;

  IF NEW.payment_status IS NULL OR TRIM(NEW.payment_status) = '' THEN
    SET NEW.payment_status = 'unpaid';
  END IF;
END$$

CREATE TRIGGER trg_orders_au_status_log
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO order_status_logs (
      order_id, from_status, to_status, operator_type, operator_id, remark
    )
    VALUES (
      NEW.id, OLD.status, NEW.status, 'trigger', NEW.user_id, 'orders.status changed by trigger'
    );
  END IF;
END$$

CREATE TRIGGER trg_payments_au_sync_order
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    IF NEW.status = 'paid' THEN
      UPDATE orders
      SET payment_status = 'paid',
          paid_at = COALESCE(NEW.paid_at, paid_at, CURRENT_TIMESTAMP)
      WHERE id = NEW.order_id;
    ELSEIF NEW.status = 'refunded' THEN
      UPDATE orders
      SET payment_status = 'refunded'
      WHERE id = NEW.order_id;
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_refunds_ai_sync_payment_order
AFTER INSERT ON refunds
FOR EACH ROW
BEGIN
  IF NEW.status IN ('success', 'refunded', 'completed') THEN
    UPDATE payments
    SET status = 'refunded'
    WHERE id = NEW.payment_id AND status <> 'refunded';

    UPDATE orders
    SET payment_status = 'refunded'
    WHERE id = NEW.order_id;
  END IF;
END$$

CREATE TRIGGER trg_refunds_au_sync_payment_order
AFTER UPDATE ON refunds
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status)
      AND NEW.status IN ('success', 'refunded', 'completed') THEN
    UPDATE payments
    SET status = 'refunded'
    WHERE id = NEW.payment_id AND status <> 'refunded';

    UPDATE orders
    SET payment_status = 'refunded'
    WHERE id = NEW.order_id;
  END IF;
END$$

CREATE TRIGGER trg_after_sales_bi_validate
BEFORE INSERT ON order_after_sales
FOR EACH ROW
BEGIN
  DECLARE v_order_count INT DEFAULT 0;
  DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;

  SELECT COUNT(*), COALESCE(MAX(total_amount), 0.00)
    INTO v_order_count, v_total_amount
    FROM orders
    WHERE id = NEW.order_id;

  IF v_order_count = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'After-sales order does not exist';
  END IF;

  IF NEW.amount IS NULL THEN
    SET NEW.amount = v_total_amount;
  END IF;

  IF NEW.amount <= 0 OR NEW.amount > v_total_amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'After-sales amount is invalid';
  END IF;
END$$

CREATE TRIGGER trg_after_sales_au_audit
AFTER UPDATE ON order_after_sales
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO audit_logs (
      module, action, operator_type, operator_id, target_type, target_id, details
    )
    VALUES (
      'after_sale',
      'status_changed',
      'trigger',
      COALESCE(NEW.merchant_id, NEW.user_id),
      'order_after_sales',
      CAST(NEW.id AS CHAR),
      JSON_OBJECT(
        'fromStatus', OLD.status,
        'toStatus', NEW.status,
        'orderId', NEW.order_id,
        'userId', NEW.user_id,
        'merchantId', NEW.merchant_id
      )
    );
  END IF;
END$$

DELIMITER ;

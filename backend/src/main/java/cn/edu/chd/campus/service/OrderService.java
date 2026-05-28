package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

  private final GenericRepository repository;

  public OrderService(GenericRepository repository) {
    this.repository = repository;
  }

  @Transactional
  @Audited(module = "snack", action = "create_order")
  public Map<String, Object> createSnackOrder(Long userId, Map<String, Object> request) {
    List<Object> requestItems = JsonUtils.toList(request.get("items"));
    if (requestItems.isEmpty()) {
      throw new BusinessException("订单项不能为空");
    }
    BigDecimal totalAmount = BigDecimal.ZERO;
    List<Map<String, Object>> items = new ArrayList<>();
    for (Object itemObject : requestItems) {
      Map<?, ?> item = (Map<?, ?>) itemObject;
      Long snackId = Maps.longValue(item.get("snackId"));
      int quantity = Maps.intValue(item.get("quantity"), 1);
      Map<String, Object> snack = repository.findById("snacks", snackId)
          .orElseThrow(() -> new BusinessException("菜品不存在"));
      BigDecimal price = Maps.decimalValue(snack.get("price"));
      BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));
      totalAmount = totalAmount.add(subtotal);
      Map<String, Object> orderItem = new LinkedHashMap<>();
      orderItem.put("snackId", snackId);
      orderItem.put("snackName", snack.get("name"));
      orderItem.put("price", price);
      orderItem.put("quantity", quantity);
      orderItem.put("subtotal", subtotal);
      items.add(orderItem);
    }
    Long orderId = createOrder(userId, "snack", items, totalAmount, null, null, Maps.stringValue(request.get("remark"), ""));
    return Map.of("orderId", orderId, "totalAmount", totalAmount);
  }

  @Transactional
  @Audited(module = "tutor", action = "create_order")
  public Map<String, Object> createTutorOrder(Long userId, Map<String, Object> request) {
    Long tutorId = Maps.longValue(request.get("tutorId"));
    int hours = Maps.intValue(request.get("hours"), 1);
    Map<String, Object> tutor = repository.findById("tutors", tutorId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "家教信息不存在或暂不可下单"));
    if (!"active".equals(tutor.get("status"))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "家教信息不存在或暂不可下单");
    }
    if (userId.equals(Maps.longValue(tutor.get("user_id")))) {
      throw new BusinessException("不能给自己发布的家教信息下单");
    }
    BigDecimal price = Maps.decimalValue(tutor.get("salary"));
    BigDecimal total = price.multiply(BigDecimal.valueOf(hours));
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("tutorId", tutorId);
    item.put("tutorName", tutor.get("name"));
    item.put("subject", tutor.get("subject"));
    item.put("grade", tutor.get("grade"));
    item.put("price", price);
    item.put("quantity", hours);
    item.put("subtotal", total);
    item.put("unit", "小时");
    Long orderId = createOrder(userId, "tutor", List.of(item), total,
        required(request, "address"), required(request, "phone"), Maps.stringValue(request.get("remark"), ""));
    return Map.of("orderId", orderId, "totalAmount", total);
  }

  @Transactional
  @Audited(module = "secondhand", action = "create_order")
  public Map<String, Object> createSecondhandOrder(Long userId, Map<String, Object> request) {
    Long itemId = Maps.longValue(request.get("itemId"));
    Map<String, Object> itemRow = repository.findById("secondhand_items", itemId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "商品不存在或暂不可下单"));
    if (!"active".equals(itemRow.get("status"))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "商品不存在或暂不可下单");
    }
    if (userId.equals(Maps.longValue(itemRow.get("user_id")))) {
      throw new BusinessException("不能给自己发布的商品下单");
    }
    BigDecimal total = Maps.decimalValue(itemRow.get("price"));
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("itemId", itemId);
    item.put("title", itemRow.get("title"));
    item.put("category", itemRow.get("category"));
    item.put("price", total);
    item.put("quantity", 1);
    item.put("subtotal", total);
    Long orderId = createOrder(userId, "secondhand", List.of(item), total,
        required(request, "address"), required(request, "phone"), Maps.stringValue(request.get("remark"), ""));
    repository.updateById("secondhand_items", itemId, Map.of("status", "sold"));
    return Map.of("orderId", orderId, "totalAmount", total);
  }

  @Transactional
  @Audited(module = "driving_school", action = "create_order")
  public Map<String, Object> createDrivingSchoolOrder(Long userId, Map<String, Object> request) {
    Long schoolId = Maps.longValue(request.get("schoolId"));
    Map<String, Object> school = repository.findById("driving_schools", schoolId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "驾校不存在或暂不可下单"));
    if (!"active".equals(school.get("status"))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "驾校不存在或暂不可下单");
    }
    BigDecimal total = Maps.decimalValue(school.get("price"));
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("schoolId", schoolId);
    item.put("schoolName", school.get("name"));
    item.put("studentName", required(request, "studentName"));
    item.put("price", total);
    item.put("quantity", 1);
    item.put("subtotal", total);
    Long orderId = createOrder(userId, "driving_school", List.of(item), total,
        required(request, "address"), required(request, "phone"), Maps.stringValue(request.get("remark"), ""));
    return Map.of("orderId", orderId, "totalAmount", total);
  }

  public List<Map<String, Object>> userOrders(Long userId, String type) {
    List<Map<String, Object>> rows = repository.find("orders", Map.of("user_id", userId, "type", type), "created_at DESC");
    return rows.stream().map(this::normalizeOrder).toList();
  }

  public Map<String, Object> userOrder(Long userId, Long orderId, String type) {
    Map<String, Object> order = repository.findById("orders", orderId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "订单不存在"));
    if (!userId.equals(Maps.longValue(order.get("user_id"))) || !type.equals(order.get("type"))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "订单不存在");
    }
    return normalizeOrder(order);
  }

  @Transactional
  @Audited(module = "order", action = "cancel")
  public Map<String, Object> cancelUserOrder(Long userId, Long orderId, String type) {
    Map<String, Object> order = repository.findById("orders", orderId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "订单不存在"));
    if (!userId.equals(Maps.longValue(order.get("user_id"))) || !type.equals(order.get("type"))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "订单不存在");
    }
    if (!"pending".equals(order.get("status"))) {
      throw new BusinessException("当前订单状态不支持取消");
    }
    if ("paid".equals(order.get("payment_status"))) {
      throw new BusinessException("订单已支付，暂不支持线上取消，请联系管理员处理");
    }
    restoreSideEffects(order);
    repository.updateById("orders", orderId, Map.of("status", "cancelled"));
    logOrderStatus(orderId, Maps.stringValue(order.get("status"), ""), "cancelled", "user", userId, "用户取消订单");
    return normalizeOrder(repository.findById("orders", orderId).orElseThrow());
  }

  @Transactional
  public void addToCart(Long userId, Map<String, Object> request) {
    Long productId = Maps.longValue(request.get("productId"));
    int quantity = Maps.intValue(request.get("quantity"), 1);
    Map<String, Object> product = repository.findById("supermarket_products", productId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "商品不存在"));
    if (Maps.intValue(product.get("stock"), 0) < quantity) {
      throw new BusinessException("库存不足");
    }
    repository.queryOne(
        "SELECT * FROM cart_items WHERE user_id = :userId AND product_id = :productId",
        Map.of("userId", userId, "productId", productId))
        .ifPresentOrElse(existing -> {
          int newQuantity = Maps.intValue(existing.get("quantity"), 0) + quantity;
          if (Maps.intValue(product.get("stock"), 0) < newQuantity) {
            throw new BusinessException("库存不足");
          }
          repository.updateById("cart_items", Maps.longValue(existing.get("id")), Map.of("quantity", newQuantity));
        }, () -> {
          Map<String, Object> values = new LinkedHashMap<>();
          values.put("user_id", userId);
          values.put("product_id", productId);
          values.put("quantity", quantity);
          repository.insert("cart_items", values);
        });
  }

  public Map<String, Object> cart(Long userId) {
    List<Map<String, Object>> rows = repository.query(
        """
        SELECT c.product_id, c.quantity, p.name, p.price, p.image, p.stock
        FROM cart_items c
        INNER JOIN supermarket_products p ON c.product_id = p.id
        WHERE c.user_id = :userId
        ORDER BY c.updated_at DESC
        """,
        Map.of("userId", userId));
    List<Map<String, Object>> items = new ArrayList<>();
    BigDecimal total = BigDecimal.ZERO;
    for (Map<String, Object> row : rows) {
      BigDecimal price = Maps.decimalValue(row.get("price"));
      int quantity = Maps.intValue(row.get("quantity"), 0);
      BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));
      total = total.add(subtotal);
      Map<String, Object> item = Maps.api(row);
      item.put("productId", row.get("product_id"));
      item.put("productName", row.get("name"));
      item.put("subtotal", subtotal);
      items.add(item);
    }
    return Map.of("items", items, "totalAmount", total);
  }

  @Transactional
  public Map<String, Object> updateCart(Long userId, Map<String, Object> request) {
    Long productId = Maps.longValue(request.get("productId"));
    int quantity = Maps.intValue(request.get("quantity"), 0);
    if (quantity <= 0) {
      removeFromCart(userId, productId);
      return cart(userId);
    }
    Map<String, Object> product = repository.findById("supermarket_products", productId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "商品不存在"));
    if (Maps.intValue(product.get("stock"), 0) < quantity) {
      throw new BusinessException("库存不足");
    }
    repository.update(
        "UPDATE cart_items SET quantity = :quantity WHERE user_id = :userId AND product_id = :productId",
        Map.of("quantity", quantity, "userId", userId, "productId", productId));
    return cart(userId);
  }

  @Transactional
  public Map<String, Object> removeFromCart(Long userId, Long productId) {
    repository.update(
        "DELETE FROM cart_items WHERE user_id = :userId AND product_id = :productId",
        Map.of("userId", userId, "productId", productId));
    return cart(userId);
  }

  @Transactional
  @Audited(module = "supermarket", action = "checkout")
  public Map<String, Object> checkout(Long userId, Map<String, Object> request) {
    List<Map<String, Object>> cartRows = repository.query(
        """
        SELECT c.product_id, c.quantity, p.name, p.price, p.stock
        FROM cart_items c
        INNER JOIN supermarket_products p ON c.product_id = p.id
        WHERE c.user_id = :userId
        FOR UPDATE
        """,
        Map.of("userId", userId));
    if (cartRows.isEmpty()) {
      throw new BusinessException("购物车为空");
    }
    List<Map<String, Object>> items = new ArrayList<>();
    BigDecimal total = BigDecimal.ZERO;
    for (Map<String, Object> row : cartRows) {
      int quantity = Maps.intValue(row.get("quantity"), 0);
      int stock = Maps.intValue(row.get("stock"), 0);
      if (stock < quantity) {
        throw new BusinessException(row.get("name") + " 库存不足");
      }
      BigDecimal price = Maps.decimalValue(row.get("price"));
      BigDecimal subtotal = price.multiply(BigDecimal.valueOf(quantity));
      total = total.add(subtotal);
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("productId", row.get("product_id"));
      item.put("productName", row.get("name"));
      item.put("price", price);
      item.put("quantity", quantity);
      item.put("subtotal", subtotal);
      items.add(item);
    }
    Long orderId = createOrder(userId, "supermarket", items, total,
        required(request, "address"), required(request, "phone"), Maps.stringValue(request.get("remark"), ""));
    for (Map<String, Object> row : cartRows) {
      Long productId = Maps.longValue(row.get("product_id"));
      int quantity = Maps.intValue(row.get("quantity"), 0);
      int before = Maps.intValue(row.get("stock"), 0);
      int after = before - quantity;
      repository.updateById("supermarket_products", productId, Map.of("stock", after));
      logStockMovement(productId, orderId, "reserve", quantity, before, after, userId);
    }
    repository.update("DELETE FROM cart_items WHERE user_id = :userId", Map.of("userId", userId));
    return Map.of("orderId", orderId, "totalAmount", total);
  }

  public Map<String, Object> normalizeOrder(Map<String, Object> order) {
    Map<String, Object> result = Maps.api(order);
    result.put("userId", order.get("user_id"));
    result.put("totalAmount", Maps.decimalValue(order.get("total_amount")));
    result.put("items", JsonUtils.toList(order.get("items")));
    result.put("createdAt", Maps.convert(order.get("created_at")));
    result.put("paidAt", Maps.convert(order.get("paid_at")));
    return result;
  }

  private Long createOrder(
      Long userId,
      String type,
      List<Map<String, Object>> items,
      BigDecimal totalAmount,
      String address,
      String phone,
      String remark) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("order_no", "O" + Instant.now().toEpochMilli() + UUID.randomUUID().toString().substring(0, 6));
    values.put("user_id", userId);
    values.put("type", type);
    values.put("items", JsonUtils.toJson(items));
    values.put("total_amount", totalAmount);
    values.put("address", address);
    values.put("phone", phone);
    values.put("remark", remark);
    values.put("status", "pending");
    values.put("payment_status", "unpaid");
    Long orderId = repository.insert("orders", values);
    logOrderStatus(orderId, null, "pending", "user", userId, "创建订单");
    return orderId;
  }

  private void restoreSideEffects(Map<String, Object> order) {
    List<Object> items = JsonUtils.toList(order.get("items"));
    String type = Maps.stringValue(order.get("type"), "");
    if ("supermarket".equals(type)) {
      for (Object itemObject : items) {
        Map<?, ?> item = (Map<?, ?>) itemObject;
        Long productId = Maps.longValue(item.get("productId"));
        int quantity = Maps.intValue(item.get("quantity"), 0);
        Map<String, Object> product = repository.findById("supermarket_products", productId).orElse(null);
        if (product == null) {
          continue;
        }
        int before = Maps.intValue(product.get("stock"), 0);
        int after = before + quantity;
        repository.updateById("supermarket_products", productId, Map.of("stock", after));
        logStockMovement(productId, Maps.longValue(order.get("id")), "release", quantity, before, after, Maps.longValue(order.get("user_id")));
      }
    }
    if ("secondhand".equals(type) && !items.isEmpty()) {
      Object itemId = ((Map<?, ?>) items.get(0)).get("itemId");
      if (itemId != null) {
        repository.updateById("secondhand_items", Maps.longValue(itemId), Map.of("status", "active"));
      }
    }
  }

  private void logOrderStatus(Long orderId, String from, String to, String operatorType, Long operatorId, String remark) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("order_id", orderId);
    values.put("from_status", from);
    values.put("to_status", to);
    values.put("operator_type", operatorType);
    values.put("operator_id", operatorId);
    values.put("remark", remark);
    repository.insert("order_status_logs", values);
  }

  private void logStockMovement(Long productId, Long orderId, String type, int quantity, int before, int after, Long operatorId) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("product_id", productId);
    values.put("order_id", orderId);
    values.put("movement_type", type);
    values.put("quantity", quantity);
    values.put("stock_before", before);
    values.put("stock_after", after);
    values.put("operator_type", "user");
    values.put("operator_id", operatorId);
    repository.insert("stock_movements", values);
  }

  private String required(Map<String, Object> request, String key) {
    String value = Maps.stringValue(request.get(key), "").trim();
    if (value.isBlank()) {
      throw new BusinessException("参数校验失败");
    }
    return value;
  }
}

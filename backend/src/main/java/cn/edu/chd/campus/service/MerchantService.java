package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MerchantService {

  private final GenericRepository repository;
  private final OrderService orderService;

  public MerchantService(GenericRepository repository, OrderService orderService) {
    this.repository = repository;
    this.orderService = orderService;
  }

  public Map<String, Object> profile(Long userId) {
    return Maps.api(activeProfile(userId));
  }

  public Map<String, Object> dashboard(Long userId) {
    Map<String, Object> profile = activeProfile(userId);
    Long merchantId = Maps.longValue(profile.get("id"));
    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("profile", Maps.api(profile));
    stats.put("snackCount", repository.count("snacks", Map.of("merchant_id", merchantId)));
    stats.put("productCount", repository.count("supermarket_products", Map.of("merchant_id", merchantId)));
    stats.put("orderCount", repository.count("orders", Map.of("merchant_id", merchantId)));
    stats.put("pendingAfterSaleCount", repository.count("order_after_sales", Map.of("merchant_id", merchantId, "status", "pending")));
    repository.queryOne(
            "SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE merchant_id = :merchantId AND payment_status = 'paid'",
            Map.of("merchantId", merchantId))
        .ifPresent(row -> stats.put("revenue", Maps.decimalValue(row.get("revenue"))));
    return stats;
  }

  public List<Map<String, Object>> categories() {
    return Maps.apiList(repository.find("supermarket_categories", Map.of(), "parent_id, id"));
  }

  public List<Map<String, Object>> snacks(Long userId, String status) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> filters = new LinkedHashMap<>();
    filters.put("merchant_id", merchantId);
    if (status != null && !status.isBlank()) {
      filters.put("status", status);
    }
    return Maps.apiList(repository.find("snacks", filters, "id DESC"));
  }

  @Transactional
  @Audited(module = "merchant", action = "add_snack")
  public Map<String, Object> addSnack(Long userId, Map<String, Object> request) {
    Map<String, Object> profile = activeProfile(userId);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("merchant_id", profile.get("id"));
    values.put("merchant", profile.get("store_name"));
    values.put("name", required(request, "name"));
    values.put("price", Maps.decimalValue(request.get("price")));
    values.put("description", Maps.stringValue(request.get("description"), ""));
    values.put("image", Maps.stringValue(request.get("image"), ""));
    values.put("status", Maps.stringValue(request.get("status"), "active"));
    Long id = repository.insert("snacks", values);
    return Maps.api(repository.findById("snacks", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "merchant", action = "update_snack")
  public Map<String, Object> updateSnack(Long userId, Long id, Map<String, Object> request) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    requireOwnership("snacks", id, merchantId);
    repository.updateById("snacks", id, updateValues(request, List.of("name", "price", "description", "image", "status")));
    return Maps.api(repository.findById("snacks", id).orElseThrow());
  }

  public void deleteSnack(Long userId, Long id) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    requireOwnership("snacks", id, merchantId);
    repository.deleteById("snacks", id);
  }

  public List<Map<String, Object>> products(Long userId, Map<String, Object> query) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> filters = new LinkedHashMap<>();
    filters.put("merchant_id", merchantId);
    if (query.get("categoryId") != null && !String.valueOf(query.get("categoryId")).isBlank()) {
      filters.put("category_id", Maps.longValue(query.get("categoryId")));
    }
    if (query.get("status") != null && !String.valueOf(query.get("status")).isBlank()) {
      filters.put("status", query.get("status"));
    }
    return Maps.apiList(repository.find("supermarket_products", filters, "id DESC"));
  }

  @Transactional
  @Audited(module = "merchant", action = "add_product")
  public Map<String, Object> addProduct(Long userId, Map<String, Object> request) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("merchant_id", merchantId);
    values.put("name", required(request, "name"));
    values.put("category_id", Maps.longValue(request.get("categoryId")));
    values.put("price", Maps.decimalValue(request.get("price")));
    values.put("spec", required(request, "spec"));
    values.put("stock", Maps.intValue(request.get("stock"), 0));
    values.put("image", Maps.stringValue(request.get("image"), ""));
    values.put("description", Maps.stringValue(request.get("description"), ""));
    values.put("status", Maps.stringValue(request.get("status"), "active"));
    Long id = repository.insert("supermarket_products", values);
    return Maps.api(repository.findById("supermarket_products", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "merchant", action = "update_product")
  public Map<String, Object> updateProduct(Long userId, Long id, Map<String, Object> request) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    requireOwnership("supermarket_products", id, merchantId);
    Map<String, Object> values = updateValues(request, List.of("name", "price", "spec", "stock", "image", "description", "status"));
    if (request.containsKey("categoryId")) {
      values.put("category_id", Maps.longValue(request.get("categoryId")));
    }
    repository.updateById("supermarket_products", id, values);
    return Maps.api(repository.findById("supermarket_products", id).orElseThrow());
  }

  public void deleteProduct(Long userId, Long id) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    requireOwnership("supermarket_products", id, merchantId);
    repository.deleteById("supermarket_products", id);
  }

  public List<Map<String, Object>> orders(Long userId, Map<String, Object> query) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("merchantId", merchantId);
    String sql = """
        SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.student_id AS customer_account
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.merchant_id = :merchantId
        """;
    if (query.get("type") != null && !String.valueOf(query.get("type")).isBlank()) {
      sql += " AND o.type = :type";
      params.put("type", query.get("type"));
    }
    if (query.get("status") != null && !String.valueOf(query.get("status")).isBlank()) {
      sql += " AND o.status = :status";
      params.put("status", query.get("status"));
    }
    sql += " ORDER BY o.created_at DESC";
    return repository.query(sql, params).stream().map(this::normalizeMerchantOrder).toList();
  }

  @Transactional
  @Audited(module = "merchant", action = "update_order_status")
  public Map<String, Object> updateOrderStatus(Long userId, Long id, String status) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> order = repository.findById("orders", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Order not found"));
    if (!merchantId.equals(Maps.longValue(order.get("merchant_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "Order not found");
    }
    if (!List.of("pending", "processing", "completed", "cancelled").contains(status)) {
      throw new BusinessException("Unsupported order status");
    }
    repository.updateById("orders", id, Map.of("status", status));
    return normalizeMerchantOrder(repository.findById("orders", id).orElseThrow());
  }

  public List<Map<String, Object>> afterSales(Long userId, String status) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("merchantId", merchantId);
    String sql = """
        SELECT af.*, o.order_no, o.type AS order_type, o.total_amount, u.name AS customer_name,
               u.email AS customer_email, o.phone AS customer_phone, o.address AS customer_address
        FROM order_after_sales af
        INNER JOIN orders o ON af.order_id = o.id
        INNER JOIN users u ON af.user_id = u.id
        WHERE af.merchant_id = :merchantId
        """;
    if (status != null && !status.isBlank()) {
      sql += " AND af.status = :status";
      params.put("status", status);
    }
    sql += " ORDER BY af.created_at DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  @Transactional
  @Audited(module = "merchant", action = "handle_after_sale")
  public Map<String, Object> handleAfterSale(Long userId, Long id, Map<String, Object> request) {
    Long merchantId = Maps.longValue(activeProfile(userId).get("id"));
    Map<String, Object> row = repository.findById("order_after_sales", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "After-sales request not found"));
    if (!merchantId.equals(Maps.longValue(row.get("merchant_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "After-sales request not found");
    }
    String status = Maps.stringValue(request.get("status"), "").trim();
    if ("approved".equals(status)) {
      status = "merchant_approved";
    } else if ("rejected".equals(status)) {
      status = "merchant_rejected";
    }
    if (!List.of("merchant_approved", "merchant_rejected").contains(status)) {
      throw new BusinessException("Unsupported after-sales status");
    }
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("status", status);
    values.put("merchant_reply", Maps.stringValue(request.get("reply"), ""));
    values.put("merchant_handled_at", Timestamp.from(Instant.now()));
    repository.updateById("order_after_sales", id, values);
    return Maps.api(repository.findById("order_after_sales", id).orElseThrow());
  }

  private Map<String, Object> activeProfile(Long userId) {
    Map<String, Object> profile = repository.findOne("merchant_profiles", Map.of("user_id", userId))
        .orElseThrow(() -> new BusinessException(HttpStatus.FORBIDDEN, "Merchant permission has not been opened"));
    if (!"active".equalsIgnoreCase(Maps.stringValue(profile.get("status"), ""))) {
      throw new BusinessException(HttpStatus.FORBIDDEN, "Merchant account is disabled");
    }
    return profile;
  }

  private void requireOwnership(String table, Long id, Long merchantId) {
    Map<String, Object> row = repository.findById(table, id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Resource not found"));
    if (!merchantId.equals(Maps.longValue(row.get("merchant_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "Resource not found");
    }
  }

  private Map<String, Object> normalizeMerchantOrder(Map<String, Object> row) {
    Map<String, Object> result = orderService.normalizeOrder(row);
    result.put("customerName", row.get("customer_name"));
    result.put("customerEmail", row.get("customer_email"));
    result.put("customerAccount", row.get("customer_account"));
    result.put("customerPhone", row.get("phone"));
    result.put("customerAddress", row.get("address"));
    return result;
  }

  private Map<String, Object> updateValues(Map<String, Object> request, List<String> allowedKeys) {
    Map<String, Object> values = new LinkedHashMap<>();
    for (String key : allowedKeys) {
      if (request.containsKey(key)) {
        values.put(key, request.get(key));
      }
    }
    return values;
  }

  private String required(Map<String, Object> request, String key) {
    String value = Maps.stringValue(request.get(key), "").trim();
    if (value.isBlank()) {
      throw new BusinessException("Required parameter is missing: " + key);
    }
    return value;
  }
}

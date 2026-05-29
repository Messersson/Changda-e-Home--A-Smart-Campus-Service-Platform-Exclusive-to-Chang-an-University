package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

  private final GenericRepository repository;
  private final OrderService orderService;

  public AdminService(GenericRepository repository, OrderService orderService) {
    this.repository = repository;
    this.orderService = orderService;
  }

  public Map<String, Object> stats() {
    Map<String, Object> stats = new LinkedHashMap<>();
    stats.put("userCount", repository.count("users", Map.of()));
    long orderCount = repository.count("orders", Map.of());
    stats.put("orderCount", orderCount);
    stats.put("snackCount", repository.count("snacks", Map.of()));
    stats.put("supermarketProductCount", repository.count("supermarket_products", Map.of()));
    stats.put("tutorCount", repository.count("tutors", Map.of()));
    stats.put("secondhandCount", repository.count("secondhand_items", Map.of()));
    stats.put("studyMaterialCount", repository.count("study_materials", Map.of()));
    stats.put("forumPostCount", repository.count("forum_posts", Map.of()));
    stats.put("drivingSchoolCount", repository.count("driving_schools", Map.of()));
    stats.put("drivingInquiryCount", repository.count("driving_inquiries", Map.of()));
    putOrderTypeCounts(stats);
    putOrderStatusCounts(stats);
    repository.queryOne(
            "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE payment_status = 'paid'",
            Map.of())
        .ifPresent(row -> stats.put("totalRevenue", Maps.decimalValue(row.get("total_revenue"))));
    if (!stats.containsKey("totalRevenue")) {
      stats.put("totalRevenue", 0);
    }
    return stats;
  }

  private void putOrderTypeCounts(Map<String, Object> stats) {
    stats.put("snackOrderCount", 0L);
    stats.put("supermarketOrderCount", 0L);
    stats.put("tutorOrderCount", 0L);
    stats.put("secondhandOrderCount", 0L);
    stats.put("drivingSchoolOrderCount", 0L);

    List<Map<String, Object>> rows = repository.query(
        "SELECT type, COUNT(*) AS order_count FROM orders GROUP BY type",
        Map.of());
    for (Map<String, Object> row : rows) {
      long count = Maps.longValue(row.get("order_count"));
      switch (Maps.stringValue(row.get("type"), "")) {
        case "snack" -> stats.put("snackOrderCount", count);
        case "supermarket" -> stats.put("supermarketOrderCount", count);
        case "tutor" -> stats.put("tutorOrderCount", count);
        case "secondhand" -> stats.put("secondhandOrderCount", count);
        case "driving_school" -> stats.put("drivingSchoolOrderCount", count);
        default -> {
        }
      }
    }
  }

  private void putOrderStatusCounts(Map<String, Object> stats) {
    stats.put("pendingOrderCount", 0L);
    stats.put("processingOrderCount", 0L);
    stats.put("completedOrderCount", 0L);
    stats.put("cancelledOrderCount", 0L);
    stats.put("paidOrderCount", repository.count("orders", Map.of("payment_status", "paid")));
    stats.put("unpaidOrderCount", repository.count("orders", Map.of("payment_status", "unpaid")));

    List<Map<String, Object>> rows = repository.query(
        "SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status",
        Map.of());
    for (Map<String, Object> row : rows) {
      long count = Maps.longValue(row.get("order_count"));
      switch (Maps.stringValue(row.get("status"), "")) {
        case "pending" -> stats.put("pendingOrderCount", count);
        case "processing" -> stats.put("processingOrderCount", count);
        case "completed" -> stats.put("completedOrderCount", count);
        case "cancelled" -> stats.put("cancelledOrderCount", count);
        default -> {
        }
      }
    }
  }

  public List<Map<String, Object>> users(String keyword) {
    String sql = "SELECT id, student_id, name, email, major, grade, role, status, created_at FROM users";
    Map<String, Object> params = new LinkedHashMap<>();
    if (keyword != null && !keyword.isBlank()) {
      sql += " WHERE name LIKE :keyword OR student_id LIKE :keyword OR email LIKE :keyword";
      params.put("keyword", "%" + keyword + "%");
    }
    sql += " ORDER BY id DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  @Audited(module = "admin", action = "update_user_status")
  public Map<String, Object> updateUserStatus(Long id, String status) {
    requireExists("users", id, "用户不存在");
    repository.updateById("users", id, Map.of("status", status));
    return Maps.api(repository.findById("users", id).orElseThrow());
  }

  public List<Map<String, Object>> snacks(String status) {
    return Maps.apiList(repository.find("snacks", statusFilter(status), "id DESC"));
  }

  @Audited(module = "admin", action = "add_snack")
  public Map<String, Object> addSnack(Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("name", required(request, "name"));
    values.put("price", Maps.decimalValue(request.get("price")));
    values.put("description", Maps.stringValue(request.get("description"), ""));
    values.put("image", Maps.stringValue(request.get("image"), ""));
    values.put("merchant", required(request, "merchant"));
    values.put("status", Maps.stringValue(request.get("status"), "active"));
    Long id = repository.insert("snacks", values);
    return Maps.api(repository.findById("snacks", id).orElseThrow());
  }

  @Audited(module = "admin", action = "update_snack")
  public Map<String, Object> updateSnack(Long id, Map<String, Object> request) {
    requireExists("snacks", id, "菜品不存在");
    repository.updateById("snacks", id, updateValues(request, List.of("name", "price", "description", "image", "merchant", "status")));
    return Maps.api(repository.findById("snacks", id).orElseThrow());
  }

  public void deleteSnack(Long id) {
    requireExists("snacks", id, "菜品不存在");
    repository.deleteById("snacks", id);
  }

  public List<Map<String, Object>> categories() {
    return Maps.apiList(repository.find("supermarket_categories", Map.of(), "parent_id, id"));
  }

  public Map<String, Object> addCategory(Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("name", required(request, "name"));
    values.put("icon", required(request, "icon"));
    values.put("parent_id", request.get("parentId"));
    Long id = repository.insert("supermarket_categories", values);
    return Maps.api(repository.findById("supermarket_categories", id).orElseThrow());
  }

  public Map<String, Object> updateCategory(Long id, Map<String, Object> request) {
    requireExists("supermarket_categories", id, "分类不存在");
    Map<String, Object> values = updateValues(request, List.of("name", "icon"));
    if (request.containsKey("parentId")) {
      values.put("parent_id", request.get("parentId"));
    }
    repository.updateById("supermarket_categories", id, values);
    return Maps.api(repository.findById("supermarket_categories", id).orElseThrow());
  }

  public void deleteCategory(Long id) {
    requireExists("supermarket_categories", id, "分类不存在");
    repository.deleteById("supermarket_categories", id);
  }

  public List<Map<String, Object>> products(Map<String, Object> query) {
    Map<String, Object> filters = new LinkedHashMap<>();
    if (query.get("categoryId") != null && !String.valueOf(query.get("categoryId")).isBlank()) {
      filters.put("category_id", Maps.longValue(query.get("categoryId")));
    }
    if (query.get("status") != null && !String.valueOf(query.get("status")).isBlank()) {
      filters.put("status", query.get("status"));
    }
    return Maps.apiList(repository.find("supermarket_products", filters, "id DESC"));
  }

  public Map<String, Object> addProduct(Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
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

  public Map<String, Object> updateProduct(Long id, Map<String, Object> request) {
    requireExists("supermarket_products", id, "商品不存在");
    Map<String, Object> values = updateValues(request, List.of("name", "price", "spec", "stock", "image", "description", "status"));
    if (request.containsKey("categoryId")) {
      values.put("category_id", request.get("categoryId"));
    }
    repository.updateById("supermarket_products", id, values);
    return Maps.api(repository.findById("supermarket_products", id).orElseThrow());
  }

  public void deleteProduct(Long id) {
    requireExists("supermarket_products", id, "商品不存在");
    repository.deleteById("supermarket_products", id);
  }

  public List<Map<String, Object>> tutors(String status) {
    return Maps.apiList(repository.find("tutors", statusFilter(status), "id DESC"));
  }

  public Map<String, Object> updateTutorStatus(Long id, String status) {
    return updateStatus("tutors", id, status, "家教信息不存在");
  }

  public void deleteTutor(Long id) {
    requireExists("tutors", id, "家教信息不存在");
    repository.deleteById("tutors", id);
  }

  public List<Map<String, Object>> secondhand(String status) {
    return normalizeJsonList(repository.find("secondhand_items", statusFilter(status), "id DESC"), "images");
  }

  public Map<String, Object> updateSecondhandStatus(Long id, String status) {
    repository.updateById("secondhand_items", id, Map.of("status", status));
    return normalizeJson(repository.findById("secondhand_items", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "二手商品不存在")), "images");
  }

  public void deleteSecondhand(Long id) {
    requireExists("secondhand_items", id, "二手商品不存在");
    repository.deleteById("secondhand_items", id);
  }

  public List<Map<String, Object>> studyMaterials(String status) {
    return Maps.apiList(repository.find("study_materials", statusFilter(status), "id DESC"));
  }

  public Map<String, Object> updateStudyMaterialStatus(Long id, String status) {
    return updateStatus("study_materials", id, status, "学习资料不存在");
  }

  public void deleteStudyMaterial(Long id) {
    requireExists("study_materials", id, "学习资料不存在");
    repository.deleteById("study_materials", id);
  }

  public List<Map<String, Object>> forumPosts(String status) {
    return normalizeJsonList(repository.find("forum_posts", statusFilter(status), "id DESC"), "images");
  }

  public Map<String, Object> updateForumPostStatus(Long id, String status) {
    repository.updateById("forum_posts", id, Map.of("status", status));
    return normalizeJson(repository.findById("forum_posts", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "帖子不存在")), "images");
  }

  public void deleteForumPost(Long id) {
    requireExists("forum_posts", id, "帖子不存在");
    repository.deleteById("forum_posts", id);
  }

  public List<Map<String, Object>> orders(Map<String, Object> query) {
    Map<String, Object> filters = new LinkedHashMap<>();
    if (query.get("type") != null && !String.valueOf(query.get("type")).isBlank()) {
      filters.put("type", query.get("type"));
    }
    if (query.get("status") != null && !String.valueOf(query.get("status")).isBlank()) {
      filters.put("status", query.get("status"));
    }
    return repository.find("orders", filters, "created_at DESC").stream()
        .map(orderService::normalizeOrder)
        .toList();
  }

  @Transactional
  @Audited(module = "admin", action = "update_order_status")
  public Map<String, Object> updateOrderStatus(Long id, String status) {
    Map<String, Object> order = repository.findById("orders", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "订单不存在"));
    if ("secondhand".equals(order.get("type"))) {
      List<Object> items = JsonUtils.toList(order.get("items"));
      if (!items.isEmpty()) {
        Object itemId = ((Map<?, ?>) items.get(0)).get("itemId");
        if (itemId != null) {
          repository.updateById("secondhand_items", Maps.longValue(itemId),
              Map.of("status", "cancelled".equals(status) ? "active" : "sold"));
        }
      }
    }
    repository.updateById("orders", id, Map.of("status", status));
    return orderService.normalizeOrder(repository.findById("orders", id).orElseThrow());
  }

  public List<Map<String, Object>> drivingSchools(String status) {
    return normalizeJsonList(repository.find("driving_schools", statusFilter(status), "id DESC"), "features");
  }

  public Map<String, Object> addDrivingSchool(Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("name", required(request, "name"));
    values.put("address", required(request, "address"));
    values.put("phone", required(request, "phone"));
    values.put("price", Maps.intValue(request.get("price"), 0));
    values.put("description", Maps.stringValue(request.get("description"), ""));
    values.put("features", JsonUtils.toJson(request.getOrDefault("features", List.of())));
    values.put("status", Maps.stringValue(request.get("status"), "active"));
    Long id = repository.insert("driving_schools", values);
    return normalizeJson(repository.findById("driving_schools", id).orElseThrow(), "features");
  }

  public Map<String, Object> updateDrivingSchool(Long id, Map<String, Object> request) {
    requireExists("driving_schools", id, "驾校不存在");
    Map<String, Object> values = updateValues(request, List.of("name", "address", "phone", "price", "description", "status"));
    if (request.containsKey("features")) {
      values.put("features", JsonUtils.toJson(request.get("features")));
    }
    repository.updateById("driving_schools", id, values);
    return normalizeJson(repository.findById("driving_schools", id).orElseThrow(), "features");
  }

  public void deleteDrivingSchool(Long id) {
    requireExists("driving_schools", id, "驾校不存在");
    repository.deleteById("driving_schools", id);
  }

  public List<Map<String, Object>> drivingInquiries() {
    return Maps.apiList(repository.query(
        """
        SELECT di.*, ds.name AS school_name
        FROM driving_inquiries di
        LEFT JOIN driving_schools ds ON di.school_id = ds.id
        ORDER BY di.created_at DESC
        """,
        Map.of()));
  }

  public void updateDrivingInquiryStatus(Long id, String status) {
    requireExists("driving_inquiries", id, "咨询记录不存在");
    repository.updateById("driving_inquiries", id, Map.of("status", status));
  }

  private Map<String, Object> statusFilter(String status) {
    if (status == null || status.isBlank()) {
      return Map.of();
    }
    return Map.of("status", status);
  }

  private Map<String, Object> updateStatus(String table, Long id, String status, String notFoundMessage) {
    requireExists(table, id, notFoundMessage);
    repository.updateById(table, id, Map.of("status", status));
    return Maps.api(repository.findById(table, id).orElseThrow());
  }

  private void requireExists(String table, Long id, String message) {
    if (repository.findById(table, id).isEmpty()) {
      throw new BusinessException(HttpStatus.NOT_FOUND, message);
    }
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
      throw new BusinessException("参数校验失败");
    }
    return value;
  }

  private List<Map<String, Object>> normalizeJsonList(List<Map<String, Object>> rows, String jsonKey) {
    return rows.stream().map(row -> normalizeJson(row, jsonKey)).toList();
  }

  private Map<String, Object> normalizeJson(Map<String, Object> row, String jsonKey) {
    Map<String, Object> result = Maps.api(row);
    result.put(jsonKey, JsonUtils.toList(row.get(jsonKey)));
    result.put(Maps.toCamel(jsonKey), JsonUtils.toList(row.get(jsonKey)));
    return result;
  }
}

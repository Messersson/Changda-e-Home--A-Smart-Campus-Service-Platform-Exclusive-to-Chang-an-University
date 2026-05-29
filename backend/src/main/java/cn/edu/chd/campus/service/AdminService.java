package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

  private static final Pattern STUDENT_ID_PATTERN = Pattern.compile("\\d{10}");
  private static final Pattern CHD_EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@chd\\.edu\\.cn$");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

  private final GenericRepository repository;
  private final OrderService orderService;
  private final PasswordEncoder passwordEncoder;
  private final GuestAccessService guestAccessService;

  public AdminService(
      GenericRepository repository,
      OrderService orderService,
      PasswordEncoder passwordEncoder,
      GuestAccessService guestAccessService) {
    this.repository = repository;
    this.orderService = orderService;
    this.passwordEncoder = passwordEncoder;
    this.guestAccessService = guestAccessService;
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
    stats.put("merchantCount", repository.count("merchant_profiles", Map.of()));
    stats.put("pendingMerchantApplicationCount", repository.count("merchant_applications", Map.of("status", "pending")));
    stats.put("afterSaleCount", repository.count("order_after_sales", Map.of()));
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

  @Transactional
  @Audited(module = "admin", action = "add_user")
  public Map<String, Object> addUser(Map<String, Object> request) {
    String studentId = required(request, "studentId");
    String email = required(request, "email");
    String password = required(request, "password");
    String role = Maps.stringValue(request.get("role"), "student").trim();
    if (!List.of("student", "admin").contains(role)) {
      throw new BusinessException("后台新增用户仅支持学生或管理员账号，商家请走入驻审核流程");
    }
    validateManagedUserIdentity(studentId, email, role);
    if (password.length() < 6) {
      throw new BusinessException("密码至少 6 位");
    }
    ensureUniqueAccount(null, studentId, email);

    Map<String, Object> values = new LinkedHashMap<>();
    values.put("student_id", studentId);
    values.put("email", email);
    values.put("password", passwordEncoder.encode(password));
    values.put("name", required(request, "name"));
    values.put("major", required(request, "major"));
    values.put("grade", required(request, "grade"));
    values.put("role", role);
    values.put("status", Maps.stringValue(request.get("status"), "active"));
    Long id = repository.insert("users", values);
    return managedUser(repository.findById("users", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "admin", action = "update_user")
  public Map<String, Object> updateUser(Long id, Map<String, Object> request) {
    Map<String, Object> existing = repository.findById("users", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "用户不存在"));

    String role = Maps.stringValue(request.getOrDefault("role", existing.get("role")), "student").trim();
    if (!List.of("student", "admin", "merchant").contains(role)) {
      throw new BusinessException("不支持的用户角色");
    }
    String studentId = Maps.stringValue(request.getOrDefault("studentId", existing.get("student_id")), "").trim();
    String email = Maps.stringValue(request.getOrDefault("email", existing.get("email")), "").trim();
    validateManagedUserIdentity(studentId, email, role);
    ensureUniqueAccount(id, studentId, email);

    Map<String, Object> values = new LinkedHashMap<>();
    if (request.containsKey("studentId")) {
      values.put("student_id", studentId);
    }
    if (request.containsKey("email")) {
      values.put("email", email);
    }
    if (request.containsKey("name")) {
      values.put("name", required(request, "name"));
    }
    if (request.containsKey("major")) {
      values.put("major", required(request, "major"));
    }
    if (request.containsKey("grade")) {
      values.put("grade", required(request, "grade"));
    }
    if (request.containsKey("role")) {
      values.put("role", role);
    }
    if (request.containsKey("status")) {
      values.put("status", Maps.stringValue(request.get("status"), "active").trim());
    }
    String password = Maps.stringValue(request.get("password"), "");
    if (!password.isBlank()) {
      if (password.length() < 6) {
        throw new BusinessException("密码至少 6 位");
      }
      values.put("password", passwordEncoder.encode(password));
    }
    repository.updateById("users", id, values);
    return managedUser(repository.findById("users", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "admin", action = "delete_user")
  public void deleteUser(Long id, Long operatorId) {
    if (id.equals(operatorId)) {
      throw new BusinessException("不能删除当前登录的管理员账号");
    }
    requireExists("users", id, "用户不存在");
    repository.deleteById("users", id);
  }

  @Audited(module = "admin", action = "update_user_status")
  public Map<String, Object> updateUserStatus(Long id, String status) {
    requireExists("users", id, "用户不存在");
    repository.updateById("users", id, Map.of("status", status));
    return managedUser(repository.findById("users", id).orElseThrow());
  }

  public Map<String, Object> guestAccessSetting() {
    return guestAccessService.guestAccessSetting();
  }

  @Audited(module = "admin", action = "update_guest_access")
  public Map<String, Object> updateGuestAccess(Map<String, Object> request) {
    Object raw = request.containsKey("guestAccessEnabled") ? request.get("guestAccessEnabled") : request.get("enabled");
    boolean enabled = raw instanceof Boolean value
        ? value
        : Boolean.parseBoolean(Maps.stringValue(raw, "false"));
    return guestAccessService.updateGuestAccess(enabled);
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

  public List<Map<String, Object>> merchantApplications(String status) {
    Map<String, Object> params = new LinkedHashMap<>();
    String sql = """
        SELECT ma.*, u.student_id, u.name AS account_name, u.status AS account_status
        FROM merchant_applications ma
        INNER JOIN users u ON ma.user_id = u.id
        """;
    if (status != null && !status.isBlank()) {
      sql += " WHERE ma.status = :status";
      params.put("status", status);
    }
    sql += " ORDER BY ma.created_at DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  @Transactional
  @Audited(module = "admin", action = "approve_merchant")
  public Map<String, Object> approveMerchantApplication(Long id, Long auditorId, Map<String, Object> request) {
    Map<String, Object> application = repository.findById("merchant_applications", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Merchant application not found"));
    Long userId = Maps.longValue(application.get("user_id"));
    Timestamp now = Timestamp.from(Instant.now());

    repository.updateById("users", userId, Map.of("role", "merchant", "status", "active"));
    Map<String, Object> applicationUpdates = new LinkedHashMap<>();
    applicationUpdates.put("status", "approved");
    applicationUpdates.put("audit_remark", Maps.stringValue(request.get("remark"), ""));
    applicationUpdates.put("auditor_id", auditorId);
    applicationUpdates.put("audited_at", now);
    repository.updateById("merchant_applications", id, applicationUpdates);

    Map<String, Object> profileValues = new LinkedHashMap<>();
    profileValues.put("user_id", userId);
    profileValues.put("application_id", id);
    profileValues.put("store_name", application.get("store_name"));
    profileValues.put("contact_name", application.get("contact_name"));
    profileValues.put("phone", application.get("phone"));
    profileValues.put("email", application.get("email"));
    profileValues.put("address", application.get("address"));
    profileValues.put("description", application.get("description"));
    profileValues.put("status", "active");
    profileValues.put("approved_at", now);

    repository.findOne("merchant_profiles", Map.of("user_id", userId))
        .ifPresentOrElse(
            existing -> repository.updateById("merchant_profiles", Maps.longValue(existing.get("id")), profileValues),
            () -> repository.insert("merchant_profiles", profileValues));
    return Maps.api(repository.findById("merchant_applications", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "admin", action = "reject_merchant")
  public Map<String, Object> rejectMerchantApplication(Long id, Long auditorId, Map<String, Object> request) {
    Map<String, Object> application = repository.findById("merchant_applications", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Merchant application not found"));
    repository.updateById("users", Maps.longValue(application.get("user_id")), Map.of("status", "rejected"));
    Map<String, Object> updates = new LinkedHashMap<>();
    updates.put("status", "rejected");
    updates.put("audit_remark", required(request, "remark"));
    updates.put("auditor_id", auditorId);
    updates.put("audited_at", Timestamp.from(Instant.now()));
    repository.updateById("merchant_applications", id, updates);
    return Maps.api(repository.findById("merchant_applications", id).orElseThrow());
  }

  public List<Map<String, Object>> merchants(String status) {
    Map<String, Object> params = new LinkedHashMap<>();
    String sql = """
        SELECT mp.*, u.student_id, u.name AS account_name, u.status AS account_status
        FROM merchant_profiles mp
        INNER JOIN users u ON mp.user_id = u.id
        """;
    if (status != null && !status.isBlank()) {
      sql += " WHERE mp.status = :status";
      params.put("status", status);
    }
    sql += " ORDER BY mp.created_at DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  @Transactional
  @Audited(module = "admin", action = "update_merchant_status")
  public Map<String, Object> updateMerchantStatus(Long id, String status) {
    Map<String, Object> profile = repository.findById("merchant_profiles", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Merchant account not found"));
    if (!List.of("active", "disabled").contains(status)) {
      throw new BusinessException("Unsupported merchant status");
    }
    repository.updateById("merchant_profiles", id, Map.of("status", status));
    repository.updateById("users", Maps.longValue(profile.get("user_id")), Map.of("status", status));
    return Maps.api(repository.findById("merchant_profiles", id).orElseThrow());
  }

  public List<Map<String, Object>> afterSales(String status) {
    Map<String, Object> params = new LinkedHashMap<>();
    String sql = """
        SELECT af.*, o.order_no, o.type AS order_type, o.total_amount, u.name AS customer_name,
               u.email AS customer_email, mp.store_name
        FROM order_after_sales af
        INNER JOIN orders o ON af.order_id = o.id
        INNER JOIN users u ON af.user_id = u.id
        INNER JOIN merchant_profiles mp ON af.merchant_id = mp.id
        """;
    if (status != null && !status.isBlank()) {
      sql += " WHERE af.status = :status";
      params.put("status", status);
    }
    sql += " ORDER BY af.created_at DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  @Transactional
  @Audited(module = "admin", action = "decide_after_sale")
  public Map<String, Object> decideAfterSale(Long id, Map<String, Object> request) {
    Map<String, Object> row = repository.findById("order_after_sales", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "After-sales request not found"));
    String status = Maps.stringValue(request.get("status"), "").trim();
    if ("approved".equals(status)) {
      status = "admin_approved";
    } else if ("rejected".equals(status)) {
      status = "admin_rejected";
    }
    if (!List.of("admin_approved", "admin_rejected", "completed").contains(status)) {
      throw new BusinessException("Unsupported after-sales decision");
    }
    Map<String, Object> updates = new LinkedHashMap<>();
    updates.put("status", status);
    updates.put("admin_reply", Maps.stringValue(request.get("reply"), ""));
    updates.put("admin_handled_at", Timestamp.from(Instant.now()));
    repository.updateById("order_after_sales", id, updates);
    if ("admin_approved".equals(status) || "completed".equals(status)) {
      String orderStatus = "return".equals(row.get("type")) ? "returned" : "refunded";
      repository.updateById("orders", Maps.longValue(row.get("order_id")),
          Map.of("status", orderStatus, "payment_status", "refund".equals(row.get("type")) ? "refunded" : "paid"));
    }
    return Maps.api(repository.findById("order_after_sales", id).orElseThrow());
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

  private void validateManagedUserIdentity(String studentId, String email, String role) {
    if (studentId.isBlank() || email.isBlank()) {
      throw new BusinessException("账号和邮箱不能为空");
    }
    if ("student".equals(role) || "admin".equals(role)) {
      if (!STUDENT_ID_PATTERN.matcher(studentId).matches()) {
        throw new BusinessException("学生或管理员账号需使用 10 位学号");
      }
      if (!CHD_EMAIL_PATTERN.matcher(email).matches()) {
        throw new BusinessException("学生或管理员邮箱需使用 @chd.edu.cn");
      }
      return;
    }
    if (!EMAIL_PATTERN.matcher(email).matches()) {
      throw new BusinessException("请输入有效邮箱");
    }
  }

  private void ensureUniqueAccount(Long currentId, String studentId, String email) {
    repository.findOne("users", Map.of("student_id", studentId)).ifPresent(user -> {
      if (currentId == null || !currentId.equals(Maps.longValue(user.get("id")))) {
        throw new BusinessException("该账号已存在");
      }
    });
    repository.findOne("users", Map.of("email", email)).ifPresent(user -> {
      if (currentId == null || !currentId.equals(Maps.longValue(user.get("id")))) {
        throw new BusinessException("该邮箱已存在");
      }
    });
  }

  private Map<String, Object> managedUser(Map<String, Object> row) {
    Map<String, Object> user = new LinkedHashMap<>();
    user.put("id", Maps.longValue(row.get("id")));
    user.put("studentId", row.get("student_id"));
    user.put("student_id", row.get("student_id"));
    user.put("name", row.get("name"));
    user.put("email", row.get("email"));
    user.put("major", row.get("major"));
    user.put("grade", row.get("grade"));
    user.put("role", row.get("role"));
    user.put("status", row.get("status"));
    user.put("createdAt", Maps.convert(row.get("created_at")));
    user.put("created_at", Maps.convert(row.get("created_at")));
    return user;
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

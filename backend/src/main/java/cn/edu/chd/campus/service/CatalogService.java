package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {

  private final GenericRepository repository;

  public CatalogService(GenericRepository repository) {
    this.repository = repository;
  }

  public List<String> snackMerchants() {
    return repository.query(
            "SELECT DISTINCT merchant FROM snacks WHERE status = :status ORDER BY merchant",
            Map.of("status", "active"))
        .stream()
        .map(item -> Maps.stringValue(item.get("merchant"), ""))
        .filter(item -> !item.isBlank())
        .toList();
  }

  public List<Map<String, Object>> snacks(String merchant) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    String sql = """
        SELECT s.*, mp.store_name AS merchant_store_name, mp.contact_name AS merchant_contact_name,
               mp.phone AS merchant_phone, mp.email AS merchant_email, mp.address AS merchant_address,
               mp.description AS merchant_description
        FROM snacks s
        LEFT JOIN merchant_profiles mp ON s.merchant_id = mp.id
        WHERE s.status = :status
        """;
    if (merchant != null && !merchant.isBlank()) {
      sql += " AND s.merchant = :merchant";
      params.put("merchant", merchant);
    }
    sql += " ORDER BY s.id DESC";
    return Maps.apiList(repository.query(sql, params));
  }

  public Map<String, Object> snack(Long id) {
    return Maps.api(repository.queryOne(
            """
            SELECT s.*, mp.store_name AS merchant_store_name, mp.contact_name AS merchant_contact_name,
                   mp.phone AS merchant_phone, mp.email AS merchant_email, mp.address AS merchant_address,
                   mp.description AS merchant_description
            FROM snacks s
            LEFT JOIN merchant_profiles mp ON s.merchant_id = mp.id
            WHERE s.id = :id AND s.status = :status
            """,
            Map.of("id", id, "status", "active"))
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "菜品不存在")));
  }

  public List<Map<String, Object>> supermarketCategories() {
    return Maps.apiList(repository.find("supermarket_categories", Map.of(), "parent_id, id"));
  }

  public List<Map<String, Object>> supermarketProducts(Map<String, Object> query) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    StringBuilder sql = new StringBuilder("""
        SELECT p.*, mp.store_name AS merchant_store_name, mp.contact_name AS merchant_contact_name,
               mp.phone AS merchant_phone, mp.email AS merchant_email, mp.address AS merchant_address,
               mp.description AS merchant_description
        FROM supermarket_products p
        LEFT JOIN merchant_profiles mp ON p.merchant_id = mp.id
        WHERE p.status = :status
        """);
    Object categoryId = query.get("categoryId");
    if (categoryId != null && !String.valueOf(categoryId).isBlank()) {
      sql.append(" AND p.category_id = :categoryId");
      params.put("categoryId", Maps.longValue(categoryId));
    }
    Object keyword = query.get("keyword");
    if (keyword != null && !String.valueOf(keyword).isBlank()) {
      sql.append(" AND p.name LIKE :keyword");
      params.put("keyword", "%" + keyword + "%");
    }
    sql.append(" ORDER BY p.id DESC");
    return Maps.apiList(repository.query(sql.toString(), params));
  }

  public Map<String, Object> supermarketProduct(Long id) {
    return Maps.api(repository.queryOne(
            """
            SELECT p.*, mp.store_name AS merchant_store_name, mp.contact_name AS merchant_contact_name,
                   mp.phone AS merchant_phone, mp.email AS merchant_email, mp.address AS merchant_address,
                   mp.description AS merchant_description
            FROM supermarket_products p
            LEFT JOIN merchant_profiles mp ON p.merchant_id = mp.id
            WHERE p.id = :id AND p.status = :status
            """,
            Map.of("id", id, "status", "active"))
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "商品不存在")));
  }

  public List<Map<String, Object>> tutors(Map<String, Object> query) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    StringBuilder sql = new StringBuilder("SELECT * FROM tutors WHERE status = :status");
    appendLike(sql, params, "subject", query.get("subject"));
    appendEquals(sql, params, "grade", "grade", query.get("grade"));
    appendNumberRange(sql, params, "salary", "minSalary", ">=", query.get("minSalary"));
    appendNumberRange(sql, params, "salary", "maxSalary", "<=", query.get("maxSalary"));
    sql.append(" ORDER BY id DESC");
    return Maps.apiList(repository.query(sql.toString(), params));
  }

  public Map<String, Object> tutor(Long id) {
    return Maps.api(repository.findById("tutors", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "家教信息不存在")));
  }

  @Audited(module = "tutor", action = "publish")
  public Map<String, Object> publishTutor(Long userId, Map<String, Object> request) {
    Map<String, Object> user = user(userId);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("user_id", userId);
    values.put("name", user.get("name"));
    values.put("subject", required(request, "subject"));
    values.put("grade", required(request, "grade"));
    values.put("salary", Maps.intValue(request.get("salary"), 0));
    values.put("description", required(request, "description"));
    values.put("contact", required(request, "contact"));
    values.put("status", "pending");
    Long id = repository.insert("tutors", values);
    return Maps.api(repository.findById("tutors", id).orElseThrow());
  }

  public List<Map<String, Object>> myTutors(Long userId) {
    return Maps.apiList(repository.find("tutors", Map.of("user_id", userId), "id DESC"));
  }

  public List<Map<String, Object>> secondhandItems(Map<String, Object> query) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    StringBuilder sql = new StringBuilder("""
        SELECT i.*, u.name AS seller_name, u.email AS seller_email
        FROM secondhand_items i
        LEFT JOIN users u ON i.user_id = u.id
        WHERE i.status = :status
        """);
    appendEquals(sql, params, "category", "category", query.get("category"));
    Object keyword = query.get("keyword");
    if (keyword != null && !String.valueOf(keyword).isBlank()) {
      sql.append(" AND (i.title LIKE :keyword OR i.description LIKE :keyword)");
      params.put("keyword", "%" + keyword + "%");
    }
    sql.append(" ORDER BY i.id DESC");
    return normalizeJsonList(repository.query(sql.toString(), params), "images");
  }

  public Map<String, Object> secondhandItem(Long id) {
    return normalizeJson(repository.queryOne(
            """
            SELECT i.*, u.name AS seller_name, u.email AS seller_email
            FROM secondhand_items i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = :id AND i.status = :status
            """,
            Map.of("id", id, "status", "active"))
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "商品不存在")), "images");
  }

  @Audited(module = "secondhand", action = "publish")
  public Map<String, Object> publishSecondhand(Long userId, Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("user_id", userId);
    values.put("title", required(request, "title"));
    values.put("category", required(request, "category"));
    values.put("price", Maps.decimalValue(request.get("price")));
    values.put("description", required(request, "description"));
    values.put("images", JsonUtils.toJson(request.getOrDefault("images", List.of())));
    values.put("status", "pending");
    Long id = repository.insert("secondhand_items", values);
    return normalizeJson(repository.findById("secondhand_items", id).orElseThrow(), "images");
  }

  public List<Map<String, Object>> mySecondhandItems(Long userId) {
    return normalizeJsonList(repository.find("secondhand_items", Map.of("user_id", userId), "id DESC"), "images");
  }

  public void addFavorite(Long userId, Long itemId) {
    if (repository.findById("secondhand_items", itemId).isEmpty()) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "商品不存在");
    }
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("user_id", userId);
    values.put("type", "secondhand");
    values.put("item_id", itemId);
    repository.insert("user_favorites", values);
  }

  public void removeFavorite(Long userId, Long itemId) {
    repository.update(
        "DELETE FROM user_favorites WHERE user_id = :userId AND type = 'secondhand' AND item_id = :itemId",
        Map.of("userId", userId, "itemId", itemId));
  }

  public List<Map<String, Object>> favorites(Long userId) {
    return normalizeJsonList(repository.query(
        """
        SELECT i.* FROM secondhand_items i
        INNER JOIN user_favorites f ON f.item_id = i.id
        WHERE f.user_id = :userId AND f.type = 'secondhand' AND i.status = 'active'
        ORDER BY f.created_at DESC
        """,
        Map.of("userId", userId)), "images");
  }

  public List<Map<String, Object>> drivingSchools() {
    return normalizeJsonList(repository.find("driving_schools", Map.of("status", "active"), "id DESC"), "features");
  }

  public Map<String, Object> drivingSchool(Long id) {
    return normalizeJson(repository.findById("driving_schools", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "驾校不存在")), "features");
  }

  @Audited(module = "driving_school", action = "inquiry")
  public void createDrivingInquiry(Long userId, Map<String, Object> request) {
    Long schoolId = Maps.longValue(request.get("schoolId"));
    if (repository.findById("driving_schools", schoolId).isEmpty()) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "驾校不存在");
    }
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("user_id", userId);
    values.put("school_id", schoolId);
    values.put("name", Maps.stringValue(request.get("name"), ""));
    values.put("phone", Maps.stringValue(request.get("phone"), ""));
    values.put("question", Maps.stringValue(request.get("question"), ""));
    values.put("status", "pending");
    repository.insert("driving_inquiries", values);
  }

  public List<Map<String, Object>> myDrivingInquiries(Long userId) {
    return Maps.apiList(repository.find("driving_inquiries", Map.of("user_id", userId), "created_at DESC"));
  }

  public List<Map<String, Object>> studyMaterials(Map<String, Object> query) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    StringBuilder sql = new StringBuilder("SELECT * FROM study_materials WHERE status = :status");
    appendEquals(sql, params, "major", "major", query.get("major"));
    appendEquals(sql, params, "grade", "grade", query.get("grade"));
    appendLike(sql, params, "subject", query.get("subject"));
    sql.append(" ORDER BY created_at DESC");
    return Maps.apiList(repository.query(sql.toString(), params));
  }

  public Map<String, Object> studyMaterial(Long id) {
    return Maps.api(repository.findOne("study_materials", Map.of("id", id, "status", "active"))
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "资料不存在")));
  }

  @Audited(module = "study_material", action = "upload")
  public Map<String, Object> uploadStudyMaterial(Long userId, Map<String, Object> request) {
    Map<String, Object> user = user(userId);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("title", required(request, "title"));
    values.put("major", required(request, "major"));
    values.put("grade", required(request, "grade"));
    values.put("subject", required(request, "subject"));
    values.put("type", Maps.stringValue(request.get("type"), "pdf"));
    values.put("size", Maps.stringValue(request.get("size"), "0MB"));
    values.put("download_count", 0);
    values.put("uploader_id", userId);
    values.put("uploader_name", user.get("name"));
    values.put("description", required(request, "description"));
    values.put("status", "pending");
    Long id = repository.insert("study_materials", values);
    return Maps.api(repository.findById("study_materials", id).orElseThrow());
  }

  public List<Map<String, Object>> myStudyMaterials(Long userId) {
    return Maps.apiList(repository.find("study_materials", Map.of("uploader_id", userId), "created_at DESC"));
  }

  public Map<String, Object> downloadStudyMaterial(Long id) {
    Map<String, Object> material = repository.findById("study_materials", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "资料不存在"));
    repository.update("UPDATE study_materials SET download_count = download_count + 1 WHERE id = :id", Map.of("id", id));
    return Map.of("downloadCount", Maps.intValue(material.get("download_count"), 0) + 1);
  }

  public List<Map<String, Object>> forumCategories() {
    return List.of(
        category("study", "学习", "book"),
        category("life", "生活", "life"),
        category("idle", "闲置", "goods"),
        category("activity", "活动", "calendar"));
  }

  public List<Map<String, Object>> forumPosts(Map<String, Object> query) {
    Map<String, Object> params = new LinkedHashMap<>();
    params.put("status", "active");
    StringBuilder sql = new StringBuilder("SELECT * FROM forum_posts WHERE status = :status");
    appendEquals(sql, params, "category", "category", query.get("category"));
    Object keyword = query.get("keyword");
    if (keyword != null && !String.valueOf(keyword).isBlank()) {
      sql.append(" AND (title LIKE :keyword OR content LIKE :keyword)");
      params.put("keyword", "%" + keyword + "%");
    }
    sql.append(" ORDER BY created_at DESC");
    List<Map<String, Object>> posts = normalizeJsonList(repository.query(sql.toString(), params), "images");
    posts.forEach(post -> post.put("comments", List.of()));
    return posts;
  }

  public Map<String, Object> forumPost(Long id) {
    Map<String, Object> post = normalizeJson(repository.findOne("forum_posts", Map.of("id", id, "status", "active"))
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "帖子不存在")), "images");
    List<Map<String, Object>> comments = Maps.apiList(repository.find("forum_comments", Map.of("post_id", id), "created_at ASC"));
    post.put("comments", comments);
    return post;
  }

  @Audited(module = "forum", action = "publish")
  public Map<String, Object> publishForumPost(Long userId, Map<String, Object> request) {
    Map<String, Object> user = user(userId);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("user_id", userId);
    values.put("user_name", user.get("name"));
    values.put("title", required(request, "title"));
    values.put("content", required(request, "content"));
    values.put("category", required(request, "category"));
    values.put("images", JsonUtils.toJson(request.getOrDefault("images", List.of())));
    values.put("likes", 0);
    values.put("status", "pending");
    Long id = repository.insert("forum_posts", values);
    Map<String, Object> post = normalizeJson(repository.findById("forum_posts", id).orElseThrow(), "images");
    post.put("comments", List.of());
    return post;
  }

  public Map<String, Object> likeForumPost(Long id) {
    Map<String, Object> post = repository.findById("forum_posts", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "帖子不存在"));
    repository.update("UPDATE forum_posts SET likes = likes + 1 WHERE id = :id", Map.of("id", id));
    return Map.of("likes", Maps.intValue(post.get("likes"), 0) + 1);
  }

  @Audited(module = "forum", action = "comment")
  public Map<String, Object> commentForumPost(Long userId, Long postId, Map<String, Object> request) {
    if (repository.findById("forum_posts", postId).isEmpty()) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "帖子不存在");
    }
    Map<String, Object> user = user(userId);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("post_id", postId);
    values.put("user_id", userId);
    values.put("user_name", user.get("name"));
    values.put("content", required(request, "content"));
    Long id = repository.insert("forum_comments", values);
    return Maps.api(repository.findById("forum_comments", id).orElseThrow());
  }

  public List<Map<String, Object>> myForumPosts(Long userId) {
    List<Map<String, Object>> posts = normalizeJsonList(repository.find("forum_posts", Map.of("user_id", userId), "created_at DESC"), "images");
    posts.forEach(post -> post.put("comments", List.of()));
    return posts;
  }

  public Map<String, Object> user(Long id) {
    return repository.findById("users", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "用户不存在"));
  }

  private void appendEquals(StringBuilder sql, Map<String, Object> params, String column, String param, Object value) {
    if (value != null && !String.valueOf(value).isBlank()) {
      sql.append(" AND ").append(column).append(" = :").append(param);
      params.put(param, value);
    }
  }

  private void appendLike(StringBuilder sql, Map<String, Object> params, String column, Object value) {
    if (value != null && !String.valueOf(value).isBlank()) {
      sql.append(" AND ").append(column).append(" LIKE :").append(column);
      params.put(column, "%" + value + "%");
    }
  }

  private void appendNumberRange(StringBuilder sql, Map<String, Object> params, String column, String param, String operator, Object value) {
    if (value != null && !String.valueOf(value).isBlank()) {
      sql.append(" AND ").append(column).append(' ').append(operator).append(" :").append(param);
      params.put(param, Maps.intValue(value, 0));
    }
  }

  private String required(Map<String, Object> request, String key) {
    String value = Maps.stringValue(request.get(key), "").trim();
    if (value.isBlank()) {
      throw new BusinessException("参数校验失败");
    }
    return value;
  }

  private Map<String, Object> category(String id, String name, String icon) {
    Map<String, Object> category = new LinkedHashMap<>();
    category.put("id", id);
    category.put("name", name);
    category.put("icon", icon);
    return category;
  }

  private List<Map<String, Object>> normalizeJsonList(List<Map<String, Object>> rows, String jsonKey) {
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      result.add(normalizeJson(row, jsonKey));
    }
    return result;
  }

  private Map<String, Object> normalizeJson(Map<String, Object> row, String jsonKey) {
    Map<String, Object> result = Maps.api(row);
    result.put(jsonKey, JsonUtils.toList(row.get(jsonKey)));
    result.put(Maps.toCamel(jsonKey), JsonUtils.toList(row.get(jsonKey)));
    return result;
  }
}

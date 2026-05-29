package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import cn.edu.chd.campus.security.JwtService;
import cn.edu.chd.campus.security.UserPrincipal;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private static final Pattern STUDENT_ID_PATTERN = Pattern.compile("\\d{10}");
  private static final Pattern CHD_EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@chd\\.edu\\.cn$");
  private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
  private static final SecureRandom RANDOM = new SecureRandom();

  private final GenericRepository repository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final boolean exposeVerificationCode;

  public AuthService(
      GenericRepository repository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      @Value("${campus.verification.expose-code}") boolean exposeVerificationCode) {
    this.repository = repository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.exposeVerificationCode = exposeVerificationCode;
  }

  public Map<String, Object> sendVerification(Map<String, Object> request) {
    String email = Maps.stringValue(request.get("email"), "").trim();
    String studentId = Maps.stringValue(request.get("studentId"), "").trim();
    validateStudentIdentity(email, studentId);
    if (repository.findOne("users", Map.of("student_id", studentId)).isPresent()) {
      throw new BusinessException("This student number has already been registered");
    }
    return createVerification(email, studentId, "The verification code has been sent to your campus email");
  }

  public Map<String, Object> sendMerchantVerification(Map<String, Object> request) {
    String email = Maps.stringValue(request.get("email"), "").trim();
    validateGeneralEmail(email);
    if (repository.findOne("users", Map.of("email", email)).isPresent()) {
      throw new BusinessException("This email has already been registered");
    }
    return createVerification(email, email, "The verification code has been sent to your email");
  }

  @Transactional
  @Audited(module = "auth", action = "register")
  public Map<String, Object> register(Map<String, Object> request) {
    String studentId = Maps.stringValue(request.get("studentId"), "").trim();
    String email = Maps.stringValue(request.get("email"), "").trim();
    String code = Maps.stringValue(request.get("code"), "").trim();
    String password = Maps.stringValue(request.get("password"), "");
    String name = Maps.stringValue(request.get("name"), "").trim();
    String major = Maps.stringValue(request.get("major"), "").trim();
    String grade = Maps.stringValue(request.get("grade"), "").trim();

    validateStudentIdentity(email, studentId);
    if (password.length() < 6 || name.isBlank() || major.isBlank() || grade.isBlank()) {
      throw new BusinessException("Invalid registration parameters");
    }
    verifyCode(email, studentId, code);
    if (repository.findOne("users", Map.of("student_id", studentId)).isPresent()
        || repository.findOne("users", Map.of("email", email)).isPresent()) {
      throw new BusinessException("This student number or email has already been registered");
    }

    Map<String, Object> values = new LinkedHashMap<>();
    values.put("student_id", studentId);
    values.put("email", email);
    values.put("password", passwordEncoder.encode(password));
    values.put("name", name);
    values.put("major", major);
    values.put("grade", grade);
    values.put("role", "student");
    values.put("status", "active");
    Long id = repository.insert("users", values);
    Map<String, Object> user = repository.findById("users", id).orElseThrow();
    return tokenPayload(user);
  }

  @Transactional
  @Audited(module = "auth", action = "merchant_register")
  public Map<String, Object> registerMerchant(Map<String, Object> request) {
    String email = Maps.stringValue(request.get("email"), "").trim();
    String code = Maps.stringValue(request.get("code"), "").trim();
    String password = Maps.stringValue(request.get("password"), "");
    String contactName = Maps.stringValue(request.get("name"), "").trim();
    String phone = Maps.stringValue(request.get("phone"), "").trim();
    String storeName = Maps.stringValue(request.get("storeName"), "").trim();
    String address = Maps.stringValue(request.get("address"), "").trim();
    String description = Maps.stringValue(request.get("description"), "").trim();

    validateGeneralEmail(email);
    if (password.length() < 6 || contactName.isBlank() || phone.isBlank() || storeName.isBlank() || address.isBlank()) {
      throw new BusinessException("Please complete the merchant application information");
    }
    verifyCode(email, email, code);
    if (repository.findOne("users", Map.of("email", email)).isPresent()) {
      throw new BusinessException("This email has already been registered");
    }

    Map<String, Object> userValues = new LinkedHashMap<>();
    userValues.put("student_id", email);
    userValues.put("email", email);
    userValues.put("password", passwordEncoder.encode(password));
    userValues.put("name", contactName);
    userValues.put("major", storeName);
    userValues.put("grade", "merchant");
    userValues.put("role", "merchant");
    userValues.put("status", "pending");
    Long userId = repository.insert("users", userValues);

    Map<String, Object> applicationValues = new LinkedHashMap<>();
    applicationValues.put("user_id", userId);
    applicationValues.put("store_name", storeName);
    applicationValues.put("contact_name", contactName);
    applicationValues.put("phone", phone);
    applicationValues.put("email", email);
    applicationValues.put("address", address);
    applicationValues.put("description", description);
    applicationValues.put("status", "pending");
    Long applicationId = repository.insert("merchant_applications", applicationValues);

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("applicationId", applicationId);
    response.put("status", "pending");
    response.put("message", "Merchant application submitted and waiting for admin approval");
    return response;
  }

  @Transactional
  @Audited(module = "auth", action = "login")
  public Map<String, Object> login(Map<String, Object> request, String ip, String userAgent) {
    String account = Maps.stringValue(request.get("studentId"), "").trim();
    String password = Maps.stringValue(request.get("password"), "");
    if (account.isBlank() || password.isBlank()) {
      throw new BusinessException("Account and password are required");
    }

    Optional<Map<String, Object>> optionalUser = findUserByAccount(account);
    boolean success = false;
    try {
      if (optionalUser.isEmpty()) {
        throw new BusinessException(HttpStatus.UNAUTHORIZED, "Account or password is incorrect");
      }
      Map<String, Object> user = optionalUser.get();
      String savedPassword = Maps.stringValue(user.get("password"), "");
      boolean valid = savedPassword.startsWith("$2")
          ? passwordEncoder.matches(password, savedPassword)
          : password.equals(savedPassword);
      if (!valid) {
        throw new BusinessException(HttpStatus.UNAUTHORIZED, "Account or password is incorrect");
      }
      String status = Maps.stringValue(user.get("status"), "");
      if ("pending".equalsIgnoreCase(status)) {
        throw new BusinessException(HttpStatus.FORBIDDEN, "The merchant application is still pending approval");
      }
      if ("rejected".equalsIgnoreCase(status)) {
        throw new BusinessException(HttpStatus.FORBIDDEN, "The merchant application has been rejected");
      }
      if (!"active".equalsIgnoreCase(status)) {
        throw new BusinessException(HttpStatus.FORBIDDEN, "This account has been disabled");
      }
      if (!savedPassword.startsWith("$2")) {
        repository.updateById("users", Maps.longValue(user.get("id")), Map.of("password", passwordEncoder.encode(password)));
      }
      success = true;
      return tokenPayload(repository.findById("users", Maps.longValue(user.get("id"))).orElse(user));
    } finally {
      recordLoginAttempt(account, ip, userAgent, success);
    }
  }

  public Map<String, Object> currentUser(Long id) {
    return serializeUser(repository.findById("users", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found")));
  }

  @Audited(module = "auth", action = "update_profile")
  public Map<String, Object> updateProfile(Long id, Map<String, Object> request) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("name", Maps.stringValue(request.get("name"), "").trim());
    values.put("major", Maps.stringValue(request.get("major"), "").trim());
    values.put("grade", Maps.stringValue(request.get("grade"), "").trim());
    if (values.values().stream().anyMatch(value -> String.valueOf(value).isBlank())) {
      throw new BusinessException("Name, major and grade are required");
    }
    repository.updateById("users", id, values);
    return currentUser(id);
  }

  @Audited(module = "auth", action = "update_password")
  public void updatePassword(Long id, Map<String, Object> request) {
    String currentPassword = Maps.stringValue(request.get("currentPassword"), "");
    String newPassword = Maps.stringValue(request.get("newPassword"), "");
    if (newPassword.length() < 6) {
      throw new BusinessException("New password must be at least 6 characters");
    }
    Map<String, Object> user = repository.findById("users", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "User not found"));
    String savedPassword = Maps.stringValue(user.get("password"), "");
    boolean valid = savedPassword.startsWith("$2")
        ? passwordEncoder.matches(currentPassword, savedPassword)
        : currentPassword.equals(savedPassword);
    if (!valid) {
      throw new BusinessException("Current password is incorrect");
    }
    repository.updateById("users", id, Map.of("password", passwordEncoder.encode(newPassword)));
  }

  private Map<String, Object> createVerification(String email, String identity, String message) {
    String code = String.valueOf(100000 + RANDOM.nextInt(900000));
    Instant expiry = Instant.now().plusSeconds(600);
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("email", email);
    values.put("student_id", identity);
    values.put("code", code);
    values.put("expiry_time", Timestamp.from(expiry));
    repository.insert("email_verifications", values);

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("message", message);
    response.put("expiryTime", expiry.toString());
    if (exposeVerificationCode) {
      response.put("debugCode", code);
    }
    return response;
  }

  private Optional<Map<String, Object>> findUserByAccount(String account) {
    Optional<Map<String, Object>> byAccount = repository.findOne("users", Map.of("student_id", account));
    if (byAccount.isPresent()) {
      return byAccount;
    }
    return repository.findOne("users", Map.of("email", account));
  }

  private void validateStudentIdentity(String email, String studentId) {
    if (!STUDENT_ID_PATTERN.matcher(studentId).matches()) {
      throw new BusinessException("Student number must be 10 digits");
    }
    if (!CHD_EMAIL_PATTERN.matcher(email).matches()) {
      throw new BusinessException("Student email must use @chd.edu.cn");
    }
  }

  private void validateGeneralEmail(String email) {
    if (!EMAIL_PATTERN.matcher(email).matches()) {
      throw new BusinessException("Please enter a valid email address");
    }
  }

  private void verifyCode(String email, String identity, String code) {
    Map<String, Object> params = Map.of("email", email, "studentId", identity, "code", code);
    Optional<Map<String, Object>> optionalVerification = repository.queryOne(
        """
        SELECT * FROM email_verifications
        WHERE email = :email AND student_id = :studentId AND code = :code AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        params);
    if (optionalVerification.isEmpty()) {
      throw new BusinessException("Verification code is invalid or expired");
    }
    Map<String, Object> verification = optionalVerification.get();
    Instant expiry = toInstant(verification.get("expiry_time"));
    if (expiry.isBefore(Instant.now())) {
      throw new BusinessException("Verification code has expired");
    }
    repository.updateById("email_verifications", Maps.longValue(verification.get("id")), Map.of("used_at", Timestamp.from(Instant.now())));
  }

  private Instant toInstant(Object value) {
    if (value instanceof Timestamp timestamp) {
      return timestamp.toInstant();
    }
    if (value instanceof LocalDateTime localDateTime) {
      return localDateTime.atZone(ZoneId.of("Asia/Shanghai")).toInstant();
    }
    if (value instanceof java.util.Date date) {
      return date.toInstant();
    }
    throw new BusinessException("Invalid verification expiry time");
  }

  private Map<String, Object> tokenPayload(Map<String, Object> user) {
    UserPrincipal principal = new UserPrincipal(
        Maps.longValue(user.get("id")),
        Maps.stringValue(user.get("student_id"), ""),
        Maps.stringValue(user.get("email"), ""),
        Maps.stringValue(user.get("role"), "student"));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("token", jwtService.createToken(principal));
    result.put("user", serializeUser(user));
    return result;
  }

  private Map<String, Object> serializeUser(Map<String, Object> user) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("id", Maps.longValue(user.get("id")));
    result.put("studentId", user.get("student_id"));
    result.put("email", user.get("email"));
    result.put("name", user.get("name"));
    result.put("major", user.get("major"));
    result.put("grade", user.get("grade"));
    result.put("role", user.get("role"));
    result.put("status", user.get("status"));
    result.put("createdAt", Maps.convert(user.get("created_at")));
    if ("merchant".equalsIgnoreCase(Maps.stringValue(user.get("role"), ""))) {
      repository.findOne("merchant_profiles", Map.of("user_id", Maps.longValue(user.get("id"))))
          .ifPresent(profile -> result.put("merchantProfile", Maps.api(profile)));
    }
    return result;
  }

  private void recordLoginAttempt(String account, String ip, String userAgent, boolean success) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("student_id", account);
    values.put("ip_address", ip);
    values.put("user_agent", userAgent == null ? "" : userAgent.substring(0, Math.min(userAgent.length(), 255)));
    values.put("success", success ? 1 : 0);
    repository.insert("login_attempts", values);
  }
}

package cn.edu.chd.campus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.repository.GenericRepository;
import cn.edu.chd.campus.security.JwtService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

  private static final String STUDENT_ID = "2023000001";
  private static final String EMAIL = "student@chd.edu.cn";

  private GenericRepository repository;
  private JwtService jwtService;
  private AuthService authService;

  @BeforeEach
  void setUp() {
    repository = mock(GenericRepository.class);
    jwtService = mock(JwtService.class);
    authService = new AuthService(repository, mock(PasswordEncoder.class), jwtService, true);
  }

  @Test
  void sendVerificationRejectsAlreadyRegisteredEmail() {
    when(repository.findOne("users", Map.of("student_id", STUDENT_ID)))
        .thenReturn(Optional.empty());
    when(repository.findOne("users", Map.of("email", EMAIL)))
        .thenReturn(Optional.of(Map.of("id", 1L)));

    assertThatThrownBy(() -> authService.sendVerification(Map.of(
        "email", EMAIL,
        "studentId", STUDENT_ID)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("email");

    verify(repository, never()).insert(eq("email_verifications"), any());
  }

  @Test
  @SuppressWarnings("unchecked")
  void registerConsumesVerificationCodeWithConditionalUpdate() {
    stubVerificationRow(Instant.now().plusSeconds(600));
    when(repository.update(contains("UPDATE email_verifications"), any())).thenReturn(1);
    stubNewUserInsert();

    Map<String, Object> result = authService.register(registrationRequest());

    assertThat(result.get("token")).isEqualTo("token");
    ArgumentCaptor<Map<String, Object>> paramsCaptor = ArgumentCaptor.forClass(Map.class);
    verify(repository).update(contains("UPDATE email_verifications"), paramsCaptor.capture());
    assertThat(paramsCaptor.getValue().get("usedAt")).isInstanceOf(Timestamp.class);
    assertThat(paramsCaptor.getValue().get("id")).isEqualTo(1L);
  }

  @Test
  void registerRejectsVerificationCodeWhenConditionalConsumptionLosesRace() {
    stubVerificationRow(Instant.now().plusSeconds(600));
    when(repository.update(contains("UPDATE email_verifications"), any())).thenReturn(0);

    assertThatThrownBy(() -> authService.register(registrationRequest()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("invalid or expired");

    verify(repository, never()).insert(eq("users"), any());
  }

  @Test
  void registerRejectsExpiredVerificationCodeWithoutConsumingIt() {
    stubVerificationRow(Instant.now().minusSeconds(1));

    assertThatThrownBy(() -> authService.register(registrationRequest()))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("expired");

    verify(repository, never()).update(contains("UPDATE email_verifications"), any());
  }

  private void stubVerificationRow(Instant expiry) {
    when(repository.queryOne(contains("FROM email_verifications"), any()))
        .thenReturn(Optional.of(Map.of(
            "id", 1L,
            "expiry_time", Timestamp.from(expiry))));
  }

  private void stubNewUserInsert() {
    when(repository.findOne("users", Map.of("student_id", STUDENT_ID)))
        .thenReturn(Optional.empty());
    when(repository.findOne("users", Map.of("email", EMAIL)))
        .thenReturn(Optional.empty());
    when(repository.insert(eq("users"), any())).thenReturn(1L);
    when(repository.findById("users", 1L)).thenReturn(Optional.of(userRow()));
    when(jwtService.createToken(any())).thenReturn("token");
  }

  private Map<String, Object> registrationRequest() {
    Map<String, Object> request = new LinkedHashMap<>();
    request.put("studentId", STUDENT_ID);
    request.put("email", EMAIL);
    request.put("code", "123456");
    request.put("password", "secret123");
    request.put("name", "Test User");
    request.put("major", "Computer Science");
    request.put("grade", "2023");
    return request;
  }

  private Map<String, Object> userRow() {
    Map<String, Object> user = new LinkedHashMap<>();
    user.put("id", 1L);
    user.put("student_id", STUDENT_ID);
    user.put("email", EMAIL);
    user.put("name", "Test User");
    user.put("major", "Computer Science");
    user.put("grade", "2023");
    user.put("role", "student");
    user.put("status", "active");
    return user;
  }
}
package cn.edu.chd.campus.security;

import cn.edu.chd.campus.common.BusinessException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final byte[] secret;
  private final long expirationSeconds;

  public JwtService(
      @Value("${campus.security.jwt-secret}") String secret,
      @Value("${campus.security.jwt-expiration-seconds}") long expirationSeconds) {
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
    this.expirationSeconds = expirationSeconds;
  }

  public String createToken(UserPrincipal principal) {
    Map<String, Object> claims = new LinkedHashMap<>();
    claims.put("id", principal.id());
    claims.put("studentId", principal.studentId());
    claims.put("email", principal.email());
    claims.put("role", principal.role());
    claims.put("exp", Instant.now().plusSeconds(expirationSeconds).getEpochSecond());
    return encode(claims);
  }

  public UserPrincipal parse(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) {
        throw new BusinessException(HttpStatus.UNAUTHORIZED, "认证令牌无效");
      }
      String expected = sign(parts[0] + "." + parts[1]);
      if (!constantEquals(expected, parts[2])) {
        throw new BusinessException(HttpStatus.UNAUTHORIZED, "认证令牌无效");
      }
      Map<String, Object> claims = OBJECT_MAPPER.readValue(base64Decode(parts[1]), MAP_TYPE);
      long exp = ((Number) claims.getOrDefault("exp", 0)).longValue();
      if (Instant.now().getEpochSecond() > exp) {
        throw new BusinessException(HttpStatus.UNAUTHORIZED, "认证令牌已过期");
      }
      return new UserPrincipal(
          ((Number) claims.get("id")).longValue(),
          String.valueOf(claims.get("studentId")),
          String.valueOf(claims.get("email")),
          String.valueOf(claims.get("role")));
    } catch (BusinessException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new BusinessException(HttpStatus.UNAUTHORIZED, "认证令牌无效");
    }
  }

  private String encode(Map<String, Object> claims) {
    try {
      String header = base64Encode(OBJECT_MAPPER.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
      String payload = base64Encode(OBJECT_MAPPER.writeValueAsBytes(claims));
      return header + "." + payload + "." + sign(header + "." + payload);
    } catch (Exception exception) {
      throw new BusinessException("生成认证令牌失败");
    }
  }

  private String sign(String content) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      return base64Encode(mac.doFinal(content.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception exception) {
      throw new BusinessException("认证签名失败");
    }
  }

  private String base64Encode(byte[] value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
  }

  private byte[] base64Decode(String value) {
    return Base64.getUrlDecoder().decode(value);
  }

  private boolean constantEquals(String left, String right) {
    if (left == null || right == null || left.length() != right.length()) {
      return false;
    }
    int result = 0;
    for (int index = 0; index < left.length(); index += 1) {
      result |= left.charAt(index) ^ right.charAt(index);
    }
    return result == 0;
  }
}

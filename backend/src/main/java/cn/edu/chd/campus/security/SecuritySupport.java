package cn.edu.chd.campus.security;

import cn.edu.chd.campus.common.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

public final class SecuritySupport {

  private SecuritySupport() {
  }

  public static UserPrincipal user(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
      throw new BusinessException(HttpStatus.UNAUTHORIZED, "登录已过期，请重新登录");
    }
    return principal;
  }
}

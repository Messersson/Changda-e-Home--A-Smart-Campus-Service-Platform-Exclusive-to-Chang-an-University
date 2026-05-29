package cn.edu.chd.campus.service;

import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GuestAccessService {

  public static final String GUEST_ACCESS_KEY = "guest_access_enabled";

  private final GenericRepository repository;

  public GuestAccessService(GenericRepository repository) {
    this.repository = repository;
  }

  public Map<String, Object> guestAccessSetting() {
    return Map.of("guestAccessEnabled", isGuestAccessEnabled());
  }

  public boolean isGuestAccessEnabled() {
    return repository.findOne("system_settings", Map.of("setting_key", GUEST_ACCESS_KEY))
        .map(row -> Boolean.parseBoolean(Maps.stringValue(row.get("setting_value"), "true")))
        .orElse(true);
  }

  @Transactional
  public Map<String, Object> updateGuestAccess(boolean enabled) {
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("setting_key", GUEST_ACCESS_KEY);
    values.put("setting_value", String.valueOf(enabled));
    values.put("description", "是否允许未登录访客浏览、查找商品和查看公开信息");

    repository.findOne("system_settings", Map.of("setting_key", GUEST_ACCESS_KEY))
        .ifPresentOrElse(
            row -> repository.updateById("system_settings", Maps.longValue(row.get("id")), values),
            () -> repository.insert("system_settings", values));
    return guestAccessSetting();
  }

  public void requireEnabledForGuest(Authentication authentication) {
    if (isLoggedIn(authentication)) {
      return;
    }
    if (!isGuestAccessEnabled()) {
      throw new BusinessException(HttpStatus.FORBIDDEN, "访客浏览功能已关闭，请登录后使用");
    }
  }

  private boolean isLoggedIn(Authentication authentication) {
    return authentication != null
        && authentication.isAuthenticated()
        && !(authentication instanceof AnonymousAuthenticationToken);
  }
}

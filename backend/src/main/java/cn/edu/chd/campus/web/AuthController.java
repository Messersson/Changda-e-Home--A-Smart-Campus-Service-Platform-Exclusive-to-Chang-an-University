package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/send-verification")
  public ApiResponse<Map<String, Object>> sendVerification(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(authService.sendVerification(Maps.mutable(request)));
  }

  @PostMapping("/register")
  public ApiResponse<Map<String, Object>> register(@RequestBody Map<String, Object> request) {
    return ApiResponse.ok(authService.register(Maps.mutable(request)), "注册成功");
  }

  @PostMapping("/login")
  public ApiResponse<Map<String, Object>> login(@RequestBody Map<String, Object> request, HttpServletRequest servletRequest) {
    return ApiResponse.ok(authService.login(Maps.mutable(request), clientIp(servletRequest), servletRequest.getHeader("User-Agent")), "登录成功");
  }

  @GetMapping("/me")
  public ApiResponse<Map<String, Object>> me(Authentication authentication) {
    return ApiResponse.ok(authService.currentUser(SecuritySupport.user(authentication).id()));
  }

  @PutMapping("/me")
  public ApiResponse<Map<String, Object>> updateProfile(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(authService.updateProfile(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "个人信息已更新");
  }

  @PutMapping("/password")
  public ApiResponse<Void> updatePassword(Authentication authentication, @RequestBody Map<String, Object> request) {
    authService.updatePassword(SecuritySupport.user(authentication).id(), Maps.mutable(request));
    return ApiResponse.ok("密码修改成功");
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout() {
    return ApiResponse.ok("退出登录成功");
  }

  private String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}

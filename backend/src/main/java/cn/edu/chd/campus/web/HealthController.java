package cn.edu.chd.campus.web;

import java.time.Instant;
import java.util.Map;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

  private final HealthEndpoint healthEndpoint;

  public HealthController(HealthEndpoint healthEndpoint) {
    this.healthEndpoint = healthEndpoint;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of(
        "status", "ok",
        "message", "服务运行正常",
        "checkedAt", Instant.now().toString(),
        "health", healthEndpoint.health());
  }
}

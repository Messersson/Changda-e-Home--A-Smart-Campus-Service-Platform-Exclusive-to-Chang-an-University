package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.service.GuestAccessService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {

  private final GuestAccessService guestAccessService;

  public PublicController(GuestAccessService guestAccessService) {
    this.guestAccessService = guestAccessService;
  }

  @GetMapping("/guest-access")
  public ApiResponse<Map<String, Object>> guestAccess() {
    return ApiResponse.ok(guestAccessService.guestAccessSetting());
  }
}

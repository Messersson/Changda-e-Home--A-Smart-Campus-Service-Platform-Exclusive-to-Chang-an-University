package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.CatalogService;
import cn.edu.chd.campus.service.OrderService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tutor")
public class TutorController {

  private final CatalogService catalogService;
  private final OrderService orderService;

  public TutorController(CatalogService catalogService, OrderService orderService) {
    this.catalogService = catalogService;
    this.orderService = orderService;
  }

  @GetMapping("/list")
  public ApiResponse<List<Map<String, Object>>> list(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(catalogService.tutors(new LinkedHashMap<>(query)));
  }

  @GetMapping("/detail/{id}")
  public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.tutor(id));
  }

  @PostMapping("/publish")
  public ApiResponse<Map<String, Object>> publish(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(catalogService.publishTutor(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "家教信息发布成功，等待审核");
  }

  @PostMapping("/order")
  public ApiResponse<Map<String, Object>> order(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.createTutorOrder(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "下单成功");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(Authentication authentication) {
    return ApiResponse.ok(orderService.userOrders(SecuritySupport.user(authentication).id(), "tutor"));
  }

  @PutMapping("/orders/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(orderService.cancelUserOrder(SecuritySupport.user(authentication).id(), id, "tutor"), "订单已取消");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(catalogService.myTutors(SecuritySupport.user(authentication).id()));
  }
}

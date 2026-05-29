package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.CatalogService;
import cn.edu.chd.campus.service.GuestAccessService;
import cn.edu.chd.campus.service.OrderService;
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
@RequestMapping("/api/snack")
public class SnackController {

  private final CatalogService catalogService;
  private final GuestAccessService guestAccessService;
  private final OrderService orderService;

  public SnackController(CatalogService catalogService, GuestAccessService guestAccessService, OrderService orderService) {
    this.catalogService = catalogService;
    this.guestAccessService = guestAccessService;
    this.orderService = orderService;
  }

  @GetMapping("/merchants")
  public ApiResponse<List<String>> merchants(Authentication authentication) {
    guestAccessService.requireEnabledForGuest(authentication);
    return ApiResponse.ok(catalogService.snackMerchants());
  }

  @GetMapping("/list")
  public ApiResponse<List<Map<String, Object>>> list(Authentication authentication, @RequestParam(required = false) String merchant) {
    guestAccessService.requireEnabledForGuest(authentication);
    return ApiResponse.ok(catalogService.snacks(merchant));
  }

  @GetMapping("/detail/{id}")
  public ApiResponse<Map<String, Object>> detail(Authentication authentication, @PathVariable Long id) {
    guestAccessService.requireEnabledForGuest(authentication);
    return ApiResponse.ok(catalogService.snack(id));
  }

  @PostMapping("/order")
  public ApiResponse<Map<String, Object>> order(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.createSnackOrder(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "下单成功");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(Authentication authentication) {
    return ApiResponse.ok(orderService.userOrders(SecuritySupport.user(authentication).id(), "snack"));
  }

  @PutMapping("/orders/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(orderService.cancelUserOrder(SecuritySupport.user(authentication).id(), id, "snack"), "订单已取消");
  }
}

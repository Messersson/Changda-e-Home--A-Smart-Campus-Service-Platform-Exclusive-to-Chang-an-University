package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.OrderService;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/after-sales")
public class AfterSaleController {

  private final OrderService orderService;

  public AfterSaleController(OrderService orderService) {
    this.orderService = orderService;
  }

  @PostMapping("/orders/{orderId}")
  public ApiResponse<Map<String, Object>> requestAfterSale(
      Authentication authentication,
      @PathVariable Long orderId,
      @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(
        orderService.requestAfterSale(SecuritySupport.user(authentication).id(), orderId, Maps.mutable(request)),
        "After-sales request submitted");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(orderService.userAfterSales(SecuritySupport.user(authentication).id()));
  }
}

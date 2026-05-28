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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/secondhand")
public class SecondhandController {

  private final CatalogService catalogService;
  private final OrderService orderService;

  public SecondhandController(CatalogService catalogService, OrderService orderService) {
    this.catalogService = catalogService;
    this.orderService = orderService;
  }

  @GetMapping("/list")
  public ApiResponse<List<Map<String, Object>>> list(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(catalogService.secondhandItems(new LinkedHashMap<>(query)));
  }

  @GetMapping("/detail/{id}")
  public ApiResponse<Map<String, Object>> detail(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.secondhandItem(id));
  }

  @PostMapping("/publish")
  public ApiResponse<Map<String, Object>> publish(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(catalogService.publishSecondhand(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "商品发布成功，等待审核");
  }

  @PostMapping("/order")
  public ApiResponse<Map<String, Object>> order(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.createSecondhandOrder(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "下单成功");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(Authentication authentication) {
    return ApiResponse.ok(orderService.userOrders(SecuritySupport.user(authentication).id(), "secondhand"));
  }

  @PutMapping("/orders/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(orderService.cancelUserOrder(SecuritySupport.user(authentication).id(), id, "secondhand"), "订单已取消");
  }

  @GetMapping("/my")
  public ApiResponse<List<Map<String, Object>>> my(Authentication authentication) {
    return ApiResponse.ok(catalogService.mySecondhandItems(SecuritySupport.user(authentication).id()));
  }

  @GetMapping("/favorites")
  public ApiResponse<List<Map<String, Object>>> favorites(Authentication authentication) {
    return ApiResponse.ok(catalogService.favorites(SecuritySupport.user(authentication).id()));
  }

  @PostMapping("/favorite/{id}")
  public ApiResponse<Void> favorite(Authentication authentication, @PathVariable Long id) {
    catalogService.addFavorite(SecuritySupport.user(authentication).id(), id);
    return ApiResponse.ok("收藏成功");
  }

  @DeleteMapping("/favorite/{id}")
  public ApiResponse<Void> unfavorite(Authentication authentication, @PathVariable Long id) {
    catalogService.removeFavorite(SecuritySupport.user(authentication).id(), id);
    return ApiResponse.ok("取消收藏成功");
  }
}

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
@RequestMapping("/api/supermarket")
public class SupermarketController {

  private final CatalogService catalogService;
  private final OrderService orderService;

  public SupermarketController(CatalogService catalogService, OrderService orderService) {
    this.catalogService = catalogService;
    this.orderService = orderService;
  }

  @GetMapping("/categories")
  public ApiResponse<List<Map<String, Object>>> categories() {
    return ApiResponse.ok(catalogService.supermarketCategories());
  }

  @GetMapping("/products")
  public ApiResponse<List<Map<String, Object>>> products(@RequestParam Map<String, String> query) {
    return ApiResponse.ok(catalogService.supermarketProducts(new LinkedHashMap<>(query)));
  }

  @GetMapping("/product/{id}")
  public ApiResponse<Map<String, Object>> product(@PathVariable Long id) {
    return ApiResponse.ok(catalogService.supermarketProduct(id));
  }

  @PostMapping("/cart/add")
  public ApiResponse<Void> addToCart(Authentication authentication, @RequestBody Map<String, Object> request) {
    orderService.addToCart(SecuritySupport.user(authentication).id(), Maps.mutable(request));
    return ApiResponse.ok("已加入购物车");
  }

  @GetMapping("/cart")
  public ApiResponse<Map<String, Object>> cart(Authentication authentication) {
    return ApiResponse.ok(orderService.cart(SecuritySupport.user(authentication).id()));
  }

  @PutMapping("/cart/update")
  public ApiResponse<Map<String, Object>> updateCart(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.updateCart(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "购物车更新成功");
  }

  @DeleteMapping("/cart/remove")
  public ApiResponse<Map<String, Object>> removeCart(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.removeFromCart(SecuritySupport.user(authentication).id(), Maps.longValue(request.get("productId"))), "商品已从购物车移除");
  }

  @PostMapping("/checkout")
  public ApiResponse<Map<String, Object>> checkout(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(orderService.checkout(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "下单成功");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(Authentication authentication) {
    return ApiResponse.ok(orderService.userOrders(SecuritySupport.user(authentication).id(), "supermarket"));
  }

  @PutMapping("/orders/{id}/cancel")
  public ApiResponse<Map<String, Object>> cancel(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(orderService.cancelUserOrder(SecuritySupport.user(authentication).id(), id, "supermarket"), "订单已取消");
  }

  @GetMapping("/order/{id}")
  public ApiResponse<Map<String, Object>> order(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(orderService.userOrder(SecuritySupport.user(authentication).id(), id, "supermarket"));
  }
}

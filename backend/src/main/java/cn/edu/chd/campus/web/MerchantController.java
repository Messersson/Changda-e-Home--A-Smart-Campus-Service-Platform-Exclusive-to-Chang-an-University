package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.MerchantService;
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
@RequestMapping("/api/merchant")
public class MerchantController {

  private final MerchantService merchantService;

  public MerchantController(MerchantService merchantService) {
    this.merchantService = merchantService;
  }

  @GetMapping("/profile")
  public ApiResponse<Map<String, Object>> profile(Authentication authentication) {
    return ApiResponse.ok(merchantService.profile(SecuritySupport.user(authentication).id()));
  }

  @GetMapping("/dashboard")
  public ApiResponse<Map<String, Object>> dashboard(Authentication authentication) {
    return ApiResponse.ok(merchantService.dashboard(SecuritySupport.user(authentication).id()));
  }

  @GetMapping("/categories")
  public ApiResponse<List<Map<String, Object>>> categories() {
    return ApiResponse.ok(merchantService.categories());
  }

  @GetMapping("/snacks")
  public ApiResponse<List<Map<String, Object>>> snacks(Authentication authentication, @RequestParam(required = false) String status) {
    return ApiResponse.ok(merchantService.snacks(SecuritySupport.user(authentication).id(), status));
  }

  @PostMapping("/snacks")
  public ApiResponse<Map<String, Object>> addSnack(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.addSnack(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "Snack added");
  }

  @PutMapping("/snacks/{id}")
  public ApiResponse<Map<String, Object>> updateSnack(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.updateSnack(SecuritySupport.user(authentication).id(), id, Maps.mutable(request)), "Snack updated");
  }

  @DeleteMapping("/snacks/{id}")
  public ApiResponse<Void> deleteSnack(Authentication authentication, @PathVariable Long id) {
    merchantService.deleteSnack(SecuritySupport.user(authentication).id(), id);
    return ApiResponse.ok("Snack deleted");
  }

  @GetMapping("/products")
  public ApiResponse<List<Map<String, Object>>> products(Authentication authentication, @RequestParam Map<String, String> query) {
    return ApiResponse.ok(merchantService.products(SecuritySupport.user(authentication).id(), new LinkedHashMap<>(query)));
  }

  @PostMapping("/products")
  public ApiResponse<Map<String, Object>> addProduct(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.addProduct(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "Product added");
  }

  @PutMapping("/products/{id}")
  public ApiResponse<Map<String, Object>> updateProduct(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.updateProduct(SecuritySupport.user(authentication).id(), id, Maps.mutable(request)), "Product updated");
  }

  @DeleteMapping("/products/{id}")
  public ApiResponse<Void> deleteProduct(Authentication authentication, @PathVariable Long id) {
    merchantService.deleteProduct(SecuritySupport.user(authentication).id(), id);
    return ApiResponse.ok("Product deleted");
  }

  @GetMapping("/orders")
  public ApiResponse<List<Map<String, Object>>> orders(Authentication authentication, @RequestParam Map<String, String> query) {
    return ApiResponse.ok(merchantService.orders(SecuritySupport.user(authentication).id(), new LinkedHashMap<>(query)));
  }

  @PutMapping("/orders/{id}/status")
  public ApiResponse<Map<String, Object>> updateOrderStatus(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.updateOrderStatus(SecuritySupport.user(authentication).id(), id, Maps.stringValue(request.get("status"), "")), "Order updated");
  }

  @GetMapping("/after-sales")
  public ApiResponse<List<Map<String, Object>>> afterSales(Authentication authentication, @RequestParam(required = false) String status) {
    return ApiResponse.ok(merchantService.afterSales(SecuritySupport.user(authentication).id(), status));
  }

  @PutMapping("/after-sales/{id}")
  public ApiResponse<Map<String, Object>> handleAfterSale(Authentication authentication, @PathVariable Long id, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(merchantService.handleAfterSale(SecuritySupport.user(authentication).id(), id, Maps.mutable(request)), "After-sales request updated");
  }
}

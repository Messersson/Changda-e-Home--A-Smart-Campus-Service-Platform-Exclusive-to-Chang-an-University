package cn.edu.chd.campus.web;

import cn.edu.chd.campus.common.ApiResponse;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.security.SecuritySupport;
import cn.edu.chd.campus.service.PaymentService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping("/create")
  public ApiResponse<Map<String, Object>> create(Authentication authentication, @RequestBody Map<String, Object> request) {
    return ApiResponse.ok(paymentService.create(SecuritySupport.user(authentication).id(), Maps.mutable(request)), "支付单已创建");
  }

  @GetMapping("/{id}")
  public ApiResponse<Map<String, Object>> get(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(paymentService.get(SecuritySupport.user(authentication).id(), id));
  }

  @PostMapping("/{id}/mock/confirm")
  public ApiResponse<Map<String, Object>> confirmMock(Authentication authentication, @PathVariable Long id) {
    return ApiResponse.ok(paymentService.confirmMock(SecuritySupport.user(authentication).id(), id), "支付成功");
  }

  @PostMapping("/{id}/refund")
  public ApiResponse<Map<String, Object>> refund(Authentication authentication, @PathVariable Long id, @RequestBody(required = false) Map<String, Object> request) {
    return ApiResponse.ok(paymentService.refund(SecuritySupport.user(authentication).id(), id, Maps.mutable(request)), "退款成功");
  }

  @PostMapping("/alipay/notify")
  public String alipayNotify() {
    return "success";
  }

  @PostMapping("/wechat/notify")
  public Map<String, String> wechatNotify() {
    return Map.of("code", "SUCCESS", "message", "成功");
  }

  @PostMapping("/wechat/refund-notify")
  public Map<String, String> wechatRefundNotify() {
    return Map.of("code", "SUCCESS", "message", "成功");
  }
}

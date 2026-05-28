package cn.edu.chd.campus.service;

import cn.edu.chd.campus.audit.Audited;
import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.Maps;
import cn.edu.chd.campus.repository.GenericRepository;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private final GenericRepository repository;
  private final String defaultProvider;
  private final boolean mockEnabled;
  private final String frontendBaseUrl;

  public PaymentService(
      GenericRepository repository,
      @Value("${campus.payment.default-provider}") String defaultProvider,
      @Value("${campus.payment.mock-enabled}") boolean mockEnabled,
      @Value("${campus.payment.frontend-base-url}") String frontendBaseUrl) {
    this.repository = repository;
    this.defaultProvider = defaultProvider;
    this.mockEnabled = mockEnabled;
    this.frontendBaseUrl = frontendBaseUrl;
  }

  @Transactional
  @Audited(module = "payment", action = "create")
  public Map<String, Object> create(Long userId, Map<String, Object> request) {
    Long orderId = Maps.longValue(request.get("orderId"));
    String provider = Maps.stringValue(request.get("provider"), defaultProvider).toLowerCase();
    if (!"mock".equals(provider)) {
      throw new BusinessException("当前 Spring Boot 版本已预留支付扩展点，演示环境请使用 mock 支付");
    }
    if (!mockEnabled) {
      throw new BusinessException(HttpStatus.FORBIDDEN, "模拟支付已关闭");
    }
    Map<String, Object> order = repository.findById("orders", orderId)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "订单不存在"));
    if (!userId.equals(Maps.longValue(order.get("user_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "订单不存在");
    }
    if ("cancelled".equals(order.get("status"))) {
      throw new BusinessException("订单已取消，无法支付");
    }
    if ("paid".equals(order.get("payment_status"))) {
      throw new BusinessException("订单已支付，无需重复支付");
    }

    Map<String, Object> existing = repository.queryOne(
        """
        SELECT * FROM payments
        WHERE order_id = :orderId AND user_id = :userId AND provider = :provider AND status = 'created'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        Map.of("orderId", orderId, "userId", userId, "provider", provider)).orElse(null);
    if (existing != null && existing.get("pay_url") != null) {
      return normalize(existing);
    }

    Map<String, Object> values = new LinkedHashMap<>();
    values.put("order_id", orderId);
    values.put("user_id", userId);
    values.put("provider", provider);
    values.put("out_trade_no", "P" + orderId + "-" + Instant.now().toEpochMilli());
    values.put("amount", Maps.decimalValue(order.get("total_amount")));
    values.put("status", "created");
    Long paymentId = repository.insert("payments", values);
    String payUrl = frontendBaseUrl.replaceAll("/+$", "") + "/pay/mock/" + paymentId;
    repository.updateById("payments", paymentId, Map.of("pay_url", payUrl));
    return normalize(repository.findById("payments", paymentId).orElseThrow());
  }

  public Map<String, Object> get(Long userId, Long id) {
    Map<String, Object> payment = repository.findById("payments", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在"));
    if (!userId.equals(Maps.longValue(payment.get("user_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在");
    }
    return normalize(payment);
  }

  @Transactional
  @Audited(module = "payment", action = "mock_confirm")
  public Map<String, Object> confirmMock(Long userId, Long id) {
    Map<String, Object> payment = repository.findById("payments", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在"));
    if (!userId.equals(Maps.longValue(payment.get("user_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在");
    }
    if (!"mock".equals(payment.get("provider")) || !"created".equals(payment.get("status"))) {
      throw new BusinessException("当前支付单状态不支持确认支付");
    }
    Timestamp paidAt = Timestamp.from(Instant.now());
    repository.updateById("payments", id, Map.of("status", "paid", "paid_at", paidAt));
    repository.updateById("orders", Maps.longValue(payment.get("order_id")), Map.of("payment_status", "paid", "paid_at", paidAt));
    return normalize(repository.findById("payments", id).orElseThrow());
  }

  @Transactional
  @Audited(module = "payment", action = "refund")
  public Map<String, Object> refund(Long userId, Long id, Map<String, Object> request) {
    Map<String, Object> payment = repository.findById("payments", id)
        .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在"));
    if (!userId.equals(Maps.longValue(payment.get("user_id")))) {
      throw new BusinessException(HttpStatus.NOT_FOUND, "支付单不存在");
    }
    if (!"paid".equals(payment.get("status"))) {
      throw new BusinessException("当前支付单状态不支持退款");
    }
    BigDecimal amount = request.containsKey("amount")
        ? Maps.decimalValue(request.get("amount"))
        : Maps.decimalValue(payment.get("amount"));
    if (amount.compareTo(BigDecimal.ZERO) <= 0 || amount.compareTo(Maps.decimalValue(payment.get("amount"))) > 0) {
      throw new BusinessException("退款金额不合法");
    }
    Timestamp refundedAt = Timestamp.from(Instant.now());
    Map<String, Object> values = new LinkedHashMap<>();
    values.put("payment_id", id);
    values.put("order_id", payment.get("order_id"));
    values.put("user_id", userId);
    values.put("provider", payment.get("provider"));
    values.put("out_refund_no", "R" + id + "-" + UUID.randomUUID().toString().substring(0, 8));
    values.put("refund_no", "MOCK-" + UUID.randomUUID().toString().substring(0, 8));
    values.put("amount", amount);
    values.put("reason", Maps.stringValue(request.get("reason"), "用户申请退款"));
    values.put("status", "success");
    values.put("raw_response", "{\"mock\":true,\"success\":true}");
    values.put("refunded_at", refundedAt);
    Long refundId = repository.insert("refunds", values);
    repository.updateById("payments", id, Map.of("status", "refunded"));
    repository.updateById("orders", Maps.longValue(payment.get("order_id")), Map.of("payment_status", "refunded"));
    return Maps.api(repository.findById("refunds", refundId).orElseThrow());
  }

  private Map<String, Object> normalize(Map<String, Object> payment) {
    Map<String, Object> result = Maps.api(payment);
    result.put("orderId", payment.get("order_id"));
    result.put("userId", payment.get("user_id"));
    result.put("outTradeNo", payment.get("out_trade_no"));
    result.put("payUrl", payment.get("pay_url"));
    result.put("amount", Maps.decimalValue(payment.get("amount")));
    result.put("createdAt", Maps.convert(payment.get("created_at")));
    result.put("paidAt", Maps.convert(payment.get("paid_at")));
    return result;
  }
}

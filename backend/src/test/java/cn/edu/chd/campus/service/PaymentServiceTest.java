package cn.edu.chd.campus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.repository.GenericRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

class PaymentServiceTest {

  private GenericRepository repository;
  private PaymentService paymentService;

  @BeforeEach
  void setUp() {
    repository = mock(GenericRepository.class);
    paymentService = new PaymentService(repository, "mock", true, "http://localhost:5173");
  }

  @Test
  void partialRefundKeepsPaymentAndOrderPaid() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("0.00"));
    stubRefundInsert();

    Map<String, Object> result = paymentService.refundForOrder(5L, new BigDecimal("40.00"), "partial refund");

    assertThat(result.get("fullyRefunded")).isEqualTo(false);
    verify(repository, never()).updateById(eq("payments"), any(), any());
    verify(repository, never()).updateById(eq("orders"), any(), any());
  }

  @Test
  void fullRefundMarksPaymentAndOrderRefunded() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("40.00"));
    stubRefundInsert();

    paymentService.refundForOrder(5L, new BigDecimal("60.00"), "full refund");

    verify(repository).updateById("payments", 7L, Map.of("status", "refunded"));
    verify(repository).updateById("orders", 5L, Map.of("payment_status", "refunded"));
  }

  @Test
  @SuppressWarnings("unchecked")
  void refundWithoutAmountRefundsRemainingBalance() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("40.00"));
    stubRefundInsert();

    paymentService.refundForOrder(5L, null, "remaining refund");

    ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
    verify(repository).insert(eq("refunds"), captor.capture());
    assertThat((BigDecimal) captor.getValue().get("amount")).isEqualByComparingTo("60.00");
    verify(repository).updateById("payments", 7L, Map.of("status", "refunded"));
  }

  @Test
  void refundRejectsAmountAboveRemainingBalance() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("80.00"));

    assertThatThrownBy(() -> paymentService.refundForOrder(5L, new BigDecimal("30.00"), "invalid refund"))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("不合法");

    verify(repository, never()).insert(eq("refunds"), any());
  }

  @Test
  void refundForOrderFullRefundMarksPaymentAndOrderRefunded() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("0.00"));
    stubRefundInsert();

    Map<String, Object> result = paymentService.refundForOrder(5L, new BigDecimal("100.00"), "admin approved");

    assertThat(result.get("fullyRefunded")).isEqualTo(true);
    verify(repository).updateById("payments", 7L, Map.of("status", "refunded"));
    verify(repository).updateById("orders", 5L, Map.of("payment_status", "refunded"));
  }

  @Test
  void refundForOrderLocksOrderBeforePayment() {
    stubPaidPayment(new BigDecimal("100.00"), new BigDecimal("0.00"));
    stubRefundInsert();

    paymentService.refundForOrder(5L, new BigDecimal("100.00"), "admin approved");

    InOrder inOrder = inOrder(repository);
    inOrder.verify(repository).queryOne(contains("FROM orders"), any());
    inOrder.verify(repository).queryOne(contains("FROM payments"), any());
  }

  @Test
  void refundForOrderRejectsMissingPaidPayment() {
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(orderRow("pending", "paid")));
    when(repository.queryOne(contains("FROM payments"), any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> paymentService.refundForOrder(5L, new BigDecimal("100.00"), "admin approved"))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("没有可退款");

    verify(repository, never()).insert(eq("refunds"), any());
  }

  @Test
  void refundForOrderRejectsOrderNotPaid() {
    when(repository.queryOne(contains("FROM payments"), any()))
        .thenReturn(Optional.of(paymentRow("paid", new BigDecimal("100.00"))));
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(orderRow("pending", "unpaid")));

    assertThatThrownBy(() -> paymentService.refundForOrder(5L, new BigDecimal("100.00"), "admin approved"))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("支付状态");

    verify(repository, never()).insert(eq("refunds"), any());
  }

  @Test
  void confirmMockRejectsOrderCancelledAfterPaymentCreated() {
    when(repository.findById("payments", 7L))
        .thenReturn(Optional.of(paymentRow("created", new BigDecimal("100.00"))));
    when(repository.queryOne(contains("FROM payments"), any()))
        .thenReturn(Optional.of(paymentRow("created", new BigDecimal("100.00"))));
    when(repository.queryOne(contains("FROM orders"), any())).thenReturn(Optional.of(Map.of(
        "id", 5L,
        "user_id", 9L,
        "status", "cancelled",
        "payment_status", "unpaid")));

    assertThatThrownBy(() -> paymentService.confirmMock(9L, 7L))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("无法确认支付");

    verify(repository, never()).updateById(eq("payments"), any(), any());
    verify(repository, never()).updateById(eq("orders"), any(), any());
  }

  @Test
  void createReusesExistingCreatedPayment() {
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(orderRow("pending", "unpaid")));
    when(repository.queryOne(contains("FROM payments"), any()))
        .thenReturn(Optional.of(paymentRow("created", new BigDecimal("100.00"))));

    Map<String, Object> result = paymentService.create(9L, Map.of("orderId", 5L));

    assertThat(result.get("id")).isEqualTo(7L);
    verify(repository, never()).insert(eq("payments"), any());
  }
  private void stubPaidPayment(BigDecimal paidAmount, BigDecimal refundedAmount) {
    when(repository.queryOne(contains("FROM payments"), any()))
        .thenReturn(Optional.of(paymentRow("paid", paidAmount)));
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(orderRow("pending", "paid")));
    when(repository.queryOne(contains("FROM refunds"), any()))
        .thenReturn(Optional.of(Map.of("refunded_amount", refundedAmount)));
  }

  private void stubRefundInsert() {
    when(repository.insert(eq("refunds"), any())).thenReturn(11L);
    when(repository.findById("refunds", 11L)).thenReturn(Optional.of(refundRow()));
  }

  private Map<String, Object> paymentRow(String status, BigDecimal amount) {
    Map<String, Object> payment = new LinkedHashMap<>();
    payment.put("id", 7L);
    payment.put("user_id", 9L);
    payment.put("order_id", 5L);
    payment.put("provider", "mock");
    payment.put("status", status);
    payment.put("amount", amount);
    payment.put("pay_url", "http://localhost:5173/pay/mock/7");
    return payment;
  }

  private Map<String, Object> orderRow(String status, String paymentStatus) {
    Map<String, Object> order = new LinkedHashMap<>();
    order.put("id", 5L);
    order.put("user_id", 9L);
    order.put("status", status);
    order.put("payment_status", paymentStatus);
    return order;
  }

  private Map<String, Object> refundRow() {
    Map<String, Object> refund = new LinkedHashMap<>();
    refund.put("id", 11L);
    refund.put("status", "success");
    return refund;
  }
}

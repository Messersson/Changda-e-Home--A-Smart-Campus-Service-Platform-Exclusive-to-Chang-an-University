package cn.edu.chd.campus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
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
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminServiceTest {

  private GenericRepository repository;
  private OrderService orderService;
  private PaymentService paymentService;
  private AdminService adminService;

  @BeforeEach
  void setUp() {
    repository = mock(GenericRepository.class);
    orderService = mock(OrderService.class);
    paymentService = mock(PaymentService.class);
    adminService = new AdminService(
        repository,
        orderService,
        paymentService,
        mock(PasswordEncoder.class),
        mock(GuestAccessService.class));
  }

  @Test
  void approveAfterSaleRefundsAndMarksFullyRefundedOrder() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("merchant_approved", "refund", new BigDecimal("50.00"))));
    when(paymentService.refundForOrder(eq(5L), eq(new BigDecimal("50.00")), anyString()))
        .thenReturn(Map.of("fullyRefunded", true));
    when(repository.findById("order_after_sales", 3L))
        .thenReturn(Optional.of(afterSaleRow("admin_approved", "refund", new BigDecimal("50.00"))));

    Map<String, Object> result = adminService.decideAfterSale(
        3L, Map.of("status", "approved", "reply", "同意"));

    assertThat(result.get("status")).isEqualTo("admin_approved");
    verify(paymentService).refundForOrder(eq(5L), eq(new BigDecimal("50.00")), eq("同意"));
    verify(orderService).completeAfterSale(5L, "refunded", false);
  }

  @Test
  void approveReturnRestoresOrderSideEffects() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("merchant_approved", "return", new BigDecimal("50.00"))));
    when(paymentService.refundForOrder(eq(5L), eq(new BigDecimal("50.00")), anyString()))
        .thenReturn(Map.of("fullyRefunded", true));
    when(repository.findById("order_after_sales", 3L))
        .thenReturn(Optional.of(afterSaleRow("admin_approved", "return", new BigDecimal("50.00"))));

    adminService.decideAfterSale(3L, Map.of("status", "approved", "reply", "同意退货"));

    verify(orderService).completeAfterSale(5L, "returned", true);
  }

  @Test
  @SuppressWarnings("unchecked")
  void rejectAfterSaleDoesNotCreateRefund() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("pending", "refund", new BigDecimal("50.00"))));
    when(repository.findById("order_after_sales", 3L))
        .thenReturn(Optional.of(afterSaleRow("admin_rejected", "refund", new BigDecimal("50.00"))));

    adminService.decideAfterSale(3L, Map.of("status", "rejected", "reply", "不同意"));

    verify(paymentService, never()).refundForOrder(any(), any(), anyString());
    ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
    verify(repository).updateById(eq("order_after_sales"), eq(3L), captor.capture());
    assertThat(captor.getValue().get("status")).isEqualTo("admin_rejected");
    verify(repository, never()).updateById(eq("orders"), any(), any());
  }

  @Test
  void partialRefundDoesNotMarkOrderRefunded() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("merchant_approved", "refund", new BigDecimal("20.00"))));
    when(paymentService.refundForOrder(eq(5L), eq(new BigDecimal("20.00")), anyString()))
        .thenReturn(Map.of("fullyRefunded", false));
    when(repository.findById("order_after_sales", 3L))
        .thenReturn(Optional.of(afterSaleRow("admin_approved", "refund", new BigDecimal("20.00"))));

    adminService.decideAfterSale(3L, Map.of("status", "approved", "reply", "部分退款"));

    verify(paymentService).refundForOrder(eq(5L), eq(new BigDecimal("20.00")), eq("部分退款"));
    verify(orderService, never()).completeAfterSale(any(), anyString(), anyBoolean());
  }

  @Test
  void decideAfterSaleRejectsAlreadyHandledRequest() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("admin_approved", "refund", new BigDecimal("50.00"))));

    assertThatThrownBy(() -> adminService.decideAfterSale(3L, Map.of("status", "approved")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("already been handled");

    verify(paymentService, never()).refundForOrder(any(), any(), anyString());
    verify(repository, never()).updateById(eq("order_after_sales"), any(), any());
  }

  private Map<String, Object> afterSaleRow(String status, String type, BigDecimal amount) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", 3L);
    row.put("order_id", 5L);
    row.put("merchant_id", 2L);
    row.put("type", type);
    row.put("amount", amount);
    row.put("status", status);
    return row;
  }
}

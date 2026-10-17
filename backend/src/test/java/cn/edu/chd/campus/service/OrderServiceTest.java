package cn.edu.chd.campus.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.common.JsonUtils;
import cn.edu.chd.campus.repository.GenericRepository;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OrderServiceTest {

  private GenericRepository repository;
  private OrderService orderService;

  @BeforeEach
  void setUp() {
    repository = mock(GenericRepository.class);
    orderService = new OrderService(repository);
  }

  @Test
  void updateOrderStatusRejectsTransitionFromTerminalStatus() {
    when(repository.queryOne(anyString(), any())).thenReturn(Optional.of(order("completed", "unpaid", "supermarket")));

    assertThatThrownBy(() -> orderService.updateOrderStatus(5L, "processing", "admin", null))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("cannot change");

    verify(repository, never()).updateById(eq("orders"), any(), any());
  }

  @Test
  void updateOrderStatusRejectsCancellingPaidOrder() {
    when(repository.queryOne(anyString(), any())).thenReturn(Optional.of(order("pending", "paid", "supermarket")));

    assertThatThrownBy(() -> orderService.updateOrderStatus(5L, "cancelled", "merchant", 3L))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("refund");

    verify(repository, never()).updateById(eq("orders"), any(), any());
  }

  @Test
  void cancellingSupermarketOrderRestoresStockAndLogsStatus() {
    Map<String, Object> order = order("pending", "unpaid", "supermarket");
    order.put("items", JsonUtils.toJson(List.of(Map.of("productId", 3L, "quantity", 2))));
    when(repository.queryOne(contains("FROM orders"), any())).thenReturn(Optional.of(order));
    when(repository.queryOne(contains("supermarket_products"), any()))
        .thenReturn(Optional.of(Map.of("id", 3L, "stock", 8)));
    when(repository.findById("orders", 5L)).thenReturn(Optional.of(order));

    orderService.updateOrderStatus(5L, "cancelled", "admin", null);

    verify(repository).updateById("supermarket_products", 3L, Map.of("stock", 10));
    verify(repository).updateById("orders", 5L, Map.of("status", "cancelled"));
    verify(repository).insert(eq("stock_movements"), any());
    verify(repository).insert(eq("order_status_logs"), any());
  }

  @Test
  void requestAfterSaleRejectsUnpaidOrder() {
    when(repository.queryOne(anyString(), any())).thenReturn(Optional.of(order("pending", "unpaid", "supermarket")));

    assertThatThrownBy(() -> orderService.requestAfterSale(9L, 5L, request("refund", "50.00")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("paid");

    verify(repository, never()).insert(eq("order_after_sales"), any());
  }

  @Test
  void requestAfterSaleRejectsAmountAboveOrderTotal() {
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(order("pending", "paid", "supermarket")));
    when(repository.queryOne(contains("FROM refunds"), any()))
        .thenReturn(Optional.of(Map.of("refunded_amount", BigDecimal.ZERO)));

    assertThatThrownBy(() -> orderService.requestAfterSale(9L, 5L, request("refund", "80.00")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("invalid");

    verify(repository, never()).insert(eq("order_after_sales"), any());
  }

  @Test
  void requestAfterSaleRejectsAmountAboveRemainingRefundableAmount() {
    when(repository.queryOne(contains("FROM orders"), any()))
        .thenReturn(Optional.of(order("pending", "paid", "supermarket")));
    when(repository.queryOne(contains("FROM refunds"), any()))
        .thenReturn(Optional.of(Map.of("refunded_amount", new BigDecimal("30.00"))));

    assertThatThrownBy(() -> orderService.requestAfterSale(9L, 5L, request("refund", "30.00")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("invalid");

    verify(repository, never()).insert(eq("order_after_sales"), any());
  }

  @Test
  void completeAfterSaleReturnRestoresSupermarketStockAndLogsStatus() {
    Map<String, Object> order = order("processing", "paid", "supermarket");
    order.put("items", JsonUtils.toJson(List.of(Map.of("productId", 3L, "quantity", 2))));
    when(repository.queryOne(contains("FROM orders"), any())).thenReturn(Optional.of(order));
    when(repository.queryOne(contains("supermarket_products"), any()))
        .thenReturn(Optional.of(Map.of("id", 3L, "stock", 8)));

    orderService.completeAfterSale(5L, "returned", true);

    verify(repository).updateById("supermarket_products", 3L, Map.of("stock", 10));
    verify(repository).updateById("orders", 5L, Map.of("status", "returned"));
    verify(repository).insert(eq("stock_movements"), any());
    verify(repository).insert(eq("order_status_logs"), any());
  }

  @Test
  void cancellingSecondhandOrderOnlyRestoresSoldItem() {
    Map<String, Object> order = order("pending", "unpaid", "secondhand");
    order.put("items", JsonUtils.toJson(List.of(Map.of("itemId", 3L))));
    when(repository.queryOne(contains("FROM orders"), any())).thenReturn(Optional.of(order));
    when(repository.findById("orders", 5L)).thenReturn(Optional.of(order));

    orderService.updateOrderStatus(5L, "cancelled", "user", 9L);

    verify(repository).update(
        "UPDATE secondhand_items SET status = 'active' WHERE id = :itemId AND status = 'sold'",
        Map.of("itemId", 3L));
  }

  @Test
  void requestAfterSaleRejectsRequestAlreadyInProgress() {
    when(repository.queryOne(anyString(), any())).thenReturn(Optional.of(order("pending", "paid", "supermarket")));
    when(repository.count(
        "order_after_sales",
        Map.of("order_id", 5L, "status", List.of("pending", "merchant_approved", "merchant_rejected"))))
        .thenReturn(1L);

    assertThatThrownBy(() -> orderService.requestAfterSale(9L, 5L, request("refund", "50.00")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("already in progress");

    verify(repository, never()).insert(eq("order_after_sales"), any());
  }

  @Test
  void addToCartLocksAndMergesExistingQuantity() {
    when(repository.queryOne(contains("FROM cart_items"), any()))
        .thenReturn(Optional.of(Map.of("id", 8L, "quantity", 1)));
    when(repository.queryOne(contains("supermarket_products"), any()))
        .thenReturn(Optional.of(Map.of("id", 3L, "stock", 5)));

    orderService.addToCart(9L, Map.of("productId", 3L, "quantity", 2));

    verify(repository).updateById("cart_items", 8L, Map.of("quantity", 3));
    verify(repository, never()).insert(eq("cart_items"), any());
  }

  @Test
  void addToCartRejectsQuantityAboveLockedStock() {
    when(repository.queryOne(contains("FROM cart_items"), any())).thenReturn(Optional.empty());
    when(repository.queryOne(contains("supermarket_products"), any()))
        .thenReturn(Optional.of(Map.of("id", 3L, "stock", 2)));

    assertThatThrownBy(() -> orderService.addToCart(9L, Map.of("productId", 3L, "quantity", 3)))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Insufficient stock");

    verify(repository, never()).insert(eq("cart_items"), any());
  }
  private Map<String, Object> request(String type, String amount) {
    Map<String, Object> request = new LinkedHashMap<>();
    request.put("type", type);
    request.put("reason", "test reason");
    request.put("amount", new BigDecimal(amount));
    return request;
  }

  private Map<String, Object> order(String status, String paymentStatus, String type) {
    Map<String, Object> order = new LinkedHashMap<>();
    order.put("id", 5L);
    order.put("user_id", 9L);
    order.put("merchant_id", 2L);
    order.put("status", status);
    order.put("payment_status", paymentStatus);
    order.put("type", type);
    order.put("total_amount", new BigDecimal("50.00"));
    order.put("items", JsonUtils.toJson(List.of()));
    return order;
  }
}

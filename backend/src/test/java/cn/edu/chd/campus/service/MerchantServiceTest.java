package cn.edu.chd.campus.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import cn.edu.chd.campus.common.BusinessException;
import cn.edu.chd.campus.repository.GenericRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MerchantServiceTest {

  private GenericRepository repository;
  private MerchantService merchantService;

  @BeforeEach
  void setUp() {
    repository = mock(GenericRepository.class);
    merchantService = new MerchantService(repository, mock(OrderService.class));
    when(repository.findOne("merchant_profiles", Map.of("user_id", 9L)))
        .thenReturn(Optional.of(profile(2L)));
  }

  @Test
  void handleAfterSaleUpdatesPendingRequest() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("pending", 2L)));
    when(repository.findById("order_after_sales", 3L))
        .thenReturn(Optional.of(afterSaleRow("merchant_approved", 2L)));

    merchantService.handleAfterSale(9L, 3L, Map.of("status", "approved", "reply", "同意"));

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
    verify(repository).updateById(eq("order_after_sales"), eq(3L), captor.capture());
    assertThat(captor.getValue().get("status")).isEqualTo("merchant_approved");
    assertThat(captor.getValue().get("merchant_reply")).isEqualTo("同意");
  }

  @Test
  void handleAfterSaleRejectsAlreadyHandledRequest() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("merchant_approved", 2L)));

    assertThatThrownBy(() -> merchantService.handleAfterSale(
        9L, 3L, Map.of("status", "approved")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("already been handled");

    verify(repository, never()).updateById(eq("order_after_sales"), any(), any());
  }

  @Test
  void handleAfterSaleHidesOtherMerchantRequest() {
    when(repository.queryOne(contains("FROM order_after_sales"), any()))
        .thenReturn(Optional.of(afterSaleRow("pending", 3L)));

    assertThatThrownBy(() -> merchantService.handleAfterSale(
        9L, 3L, Map.of("status", "approved")))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("not found");

    verify(repository, never()).updateById(eq("order_after_sales"), any(), any());
  }

  private Map<String, Object> profile(Long id) {
    Map<String, Object> profile = new LinkedHashMap<>();
    profile.put("id", id);
    profile.put("user_id", 9L);
    profile.put("status", "active");
    return profile;
  }

  private Map<String, Object> afterSaleRow(String status, Long merchantId) {
    Map<String, Object> row = new LinkedHashMap<>();
    row.put("id", 3L);
    row.put("merchant_id", merchantId);
    row.put("status", status);
    return row;
  }
}
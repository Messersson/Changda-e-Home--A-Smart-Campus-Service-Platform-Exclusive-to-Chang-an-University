<template>
  <div class="pay-page">
    <el-card class="pay-card" v-loading="loading">
      <template #header>
        <div class="pay-card__header">
          <div>
            <h2>模拟支付</h2>
            <p>用于本地/测试环境，确认支付后会把订单标记为已支付。</p>
          </div>
          <el-tag :type="paymentStatusTagType" effect="plain">
            {{ paymentStatusText }}
          </el-tag>
        </div>
      </template>

      <el-empty v-if="!payment && !loading" description="支付单不存在或无权限访问" />

      <div v-else class="pay-detail">
        <div class="pay-detail__row">
          <span class="label">支付单号</span>
          <strong>#{{ paymentId }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">订单号</span>
          <strong>#{{ payment?.orderId }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">金额</span>
          <strong class="amount">¥{{ formatCurrency(payment?.amount) }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">渠道</span>
          <strong>{{ payment?.provider || 'mock' }}</strong>
        </div>

        <div class="pay-actions">
          <el-button
            v-if="payment?.status !== 'paid'"
            type="primary"
            :loading="confirming"
            @click="confirmPayment"
          >
            确认支付
          </el-button>
          <el-button @click="goOrders">返回订单</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { paymentApi } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const confirming = ref(false)
const payment = ref(null)

const paymentId = computed(() => String(route.params.paymentId || ''))

const paymentStatusText = computed(() => {
  if (!payment.value) return '未知'
  if (payment.value.status === 'paid') return '已支付'
  if (payment.value.status === 'created') return '待支付'
  if (payment.value.status === 'closed') return '已关闭'
  if (payment.value.status === 'failed') return '失败'
  return payment.value.status || '未知'
})

const paymentStatusTagType = computed(() => {
  if (!payment.value) return 'info'
  if (payment.value.status === 'paid') return 'success'
  if (payment.value.status === 'created') return 'warning'
  if (payment.value.status === 'failed') return 'danger'
  return 'info'
})

const formatCurrency = (value) => Number(value || 0).toFixed(2)

const loadPayment = async () => {
  if (!paymentId.value) return

  loading.value = true
  try {
    const result = await paymentApi.getPayment(paymentId.value)
    payment.value = result?.data || null
  } catch (error) {
    payment.value = null
    console.error('加载支付单失败:', error)
  } finally {
    loading.value = false
  }
}

const confirmPayment = async () => {
  if (!paymentId.value || confirming.value) return

  confirming.value = true
  try {
    const result = await paymentApi.confirmMockPayment(paymentId.value)
    payment.value = result?.data || payment.value
    ElMessage.success(result?.message || '支付成功')
  } catch (error) {
    console.error('确认支付失败:', error)
  } finally {
    confirming.value = false
  }
}

const goOrders = () => {
  router.push('/orders')
}

onMounted(() => {
  loadPayment()
})
</script>

<style scoped>
.pay-page {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.pay-card {
  width: min(720px, 96vw);
  border-radius: 18px;
}

.pay-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.pay-card__header h2 {
  margin: 0;
  font-size: 20px;
}

.pay-card__header p {
  margin: 6px 0 0;
  color: var(--app-text-soft);
  font-size: 13px;
}

.pay-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pay-detail__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(244, 247, 255, 0.7);
}

.pay-detail__row .label {
  color: var(--app-text-soft);
  font-size: 13px;
}

.pay-detail__row strong {
  color: #10213f;
}

.pay-detail__row .amount {
  font-size: 18px;
}

.pay-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}
</style>


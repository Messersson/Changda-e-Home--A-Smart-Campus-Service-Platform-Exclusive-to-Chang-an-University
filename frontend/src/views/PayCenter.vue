<template>
  <div class="pay-page">
    <el-card class="pay-card" v-loading="loading">
      <template #header>
        <div class="pay-card__header">
          <div>
            <h2>订单支付</h2>
            <p>请完成支付后返回，本页面可刷新支付状态。</p>
          </div>
          <el-tag :type="paymentStatusTagType" effect="plain">{{ paymentStatusText }}</el-tag>
        </div>
      </template>

      <el-empty v-if="!payment && !loading" description="支付单不存在或无权限访问" />

      <div v-else class="pay-detail">
        <div class="pay-detail__row">
          <span class="label">支付单号</span>
          <strong>#{{ payment?.id }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">订单号</span>
          <strong>#{{ payment?.orderId }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">支付渠道</span>
          <strong>{{ providerText }}</strong>
        </div>
        <div class="pay-detail__row">
          <span class="label">金额</span>
          <strong class="amount">¥{{ formatCurrency(payment?.amount) }}</strong>
        </div>

        <el-alert
          v-if="payment?.status !== 'paid' && payment?.provider !== 'mock'"
          type="info"
          :closable="false"
          show-icon
          title="请点击“去支付”完成付款，支付完成后点击“刷新状态”"
        />

        <div class="pay-actions">
          <el-button v-if="payment?.provider !== 'mock'" type="primary" @click="goPay">去支付</el-button>
          <el-button v-if="payment?.provider === 'mock' && payment?.status !== 'paid'" type="primary" :loading="confirming" @click="confirmMockPayment">确认支付</el-button>
          <el-button :loading="loading" @click="loadPayment">刷新状态</el-button>
          <el-button @click="goOrders">查看我的订单</el-button>
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
const fallbackOrderId = computed(() => Number(route.query.orderId || 0))
const fallbackProvider = computed(() => String(route.query.provider || import.meta.env.VITE_PAYMENT_PROVIDER || 'alipay'))

const paymentStatusText = computed(() => {
  const status = payment.value?.status
  if (status === 'paid') return '已支付'
  if (status === 'created') return '待支付'
  if (status === 'refunded') return '已退款'
  if (status === 'closed') return '已关闭'
  if (status === 'failed') return '失败'
  return status || '未知'
})

const paymentStatusTagType = computed(() => {
  const status = payment.value?.status
  if (status === 'paid') return 'success'
  if (status === 'created') return 'warning'
  if (status === 'failed') return 'danger'
  return 'info'
})

const providerText = computed(() => {
  const provider = payment.value?.provider
  if (provider === 'alipay') return '支付宝'
  if (provider === 'wechat') return '微信支付'
  if (provider === 'mock') return '模拟支付'
  return provider || '未知渠道'
})

const formatCurrency = (value) => Number(value || 0).toFixed(2)

const loadPayment = async () => {
  if (!paymentId.value) return
  loading.value = true
  try {
    const result = await paymentApi.getPayment(paymentId.value)
    payment.value = result?.data || null
  } catch (error) {
    const fallbackPayUrl = String(route.query.payUrl || '')
    const providerFromQuery = String(route.query.provider || '')
    const fallbackAmount = Number(route.query.amount || 0)

    if (fallbackPayUrl) {
      payment.value = {
        id: Number(paymentId.value || 0),
        orderId: null,
        provider: providerFromQuery || 'unknown',
        amount: fallbackAmount || 0,
        status: 'created',
        payUrl: fallbackPayUrl
      }
      ElMessage.warning('支付单详情暂不可用，已切换到支付直连模式')
    } else if (fallbackOrderId.value > 0) {
      try {
        const recreated = await paymentApi.createPayment({
          orderId: fallbackOrderId.value,
          provider: fallbackProvider.value
        })
        const newPaymentId = Number(recreated?.data?.id || 0)
        if (newPaymentId > 0) {
          await router.replace({
            path: `/pay/${newPaymentId}`,
            query: {
              orderId: String(fallbackOrderId.value),
              payUrl: recreated?.data?.payUrl || '',
              provider: recreated?.data?.provider || fallbackProvider.value,
              amount: typeof recreated?.data?.amount === 'number' ? String(recreated.data.amount) : ''
            }
          })
          return
        }
      } catch (recreateError) {
        console.error('重建支付单失败:', recreateError)
      }

      payment.value = null
      ElMessage.error('支付单已失效，请返回订单页重新发起支付')
    } else {
      payment.value = null
    }
    console.error('加载支付单失败:', error)
  } finally {
    loading.value = false
  }
}

const goPay = () => {
  const payUrl = payment.value?.payUrl
  if (!payUrl) {
    ElMessage.error('当前支付单暂无支付链接')
    return
  }
  window.open(payUrl, '_blank')
}

const confirmMockPayment = async () => {
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
  width: min(760px, 96vw);
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
  flex-wrap: wrap;
}
</style>

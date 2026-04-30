<template>
  <div class="orders-page">
    <div class="page-header">
      <div>
        <h2>我的订单</h2>
        <p>集中查看家教、二手、驾校、小吃摊和校园超市订单，待处理订单支持主动取消。</p>
      </div>

      <div class="page-header__actions">
        <el-radio-group v-model="activeType" size="large">
          <el-radio-button v-for="option in typeOptions" :key="option.value" :label="option.value">
            {{ option.label }}
          </el-radio-button>
        </el-radio-group>
        <el-button :icon="RefreshRight" :loading="loading" @click="loadOrders">刷新</el-button>
      </div>
    </div>

    <div class="summary-strip">
      <section class="summary-card glass-panel">
        <span>订单总数</span>
        <strong>{{ orderSummary.total }}</strong>
        <small>覆盖平台全部下单模块</small>
      </section>
      <section class="summary-card glass-panel summary-card--pending">
        <span>待处理</span>
        <strong>{{ orderSummary.pending }}</strong>
        <small>这些订单仍可由你主动取消</small>
      </section>
      <section class="summary-card glass-panel summary-card--type">
        <span>{{ activeTypeText }}</span>
        <strong>{{ filteredOrders.length }}</strong>
        <small>按当前筛选条件展示</small>
      </section>
    </div>

    <el-card class="orders-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="card-header__copy">
            <span>{{ activeTypeText }}</span>
            <p>{{ filteredOrders.length }} 笔订单</p>
          </div>

          <div class="filter-actions">
            <el-select v-model="statusFilter" placeholder="订单状态" style="width: 140px">
              <el-option label="全部状态" value="" />
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </div>
        </div>
      </template>

      <el-empty
        v-if="!filteredOrders.length"
        description="暂无订单记录，去家教、二手、驾校、小吃摊或超市下单体验一下吧。"
      />

      <div v-else class="order-list">
        <article
          v-for="order in filteredOrders"
          :key="orderKey(order)"
          class="order-card"
          :class="`order-card--${order.type}`"
        >
          <div class="order-card__header">
            <div>
              <div class="order-card__badges">
                <el-tag size="small" :type="getTypeTagType(order.type)">
                  {{ getTypeText(order.type) }}
                </el-tag>
                <el-tag size="small" effect="plain" :type="getStatusType(order.status)">
                  {{ getStatusText(order.status) }}
                </el-tag>
                <el-tag size="small" effect="plain" :type="getPaymentStatusType(getPaymentStatus(order))">
                  {{ getPaymentStatusText(getPaymentStatus(order)) }}
                </el-tag>
              </div>
              <h3>订单 #{{ order.id }}</h3>
              <p>{{ formatTime(order.createdAt) }}</p>
            </div>

            <div class="order-card__amount">
              <span>订单金额</span>
              <strong>¥{{ formatCurrency(order.totalAmount) }}</strong>
            </div>
          </div>

          <div class="order-items">
            <div v-for="(item, index) in order.items" :key="`${orderKey(order)}-${index}`" class="order-item">
              <span class="order-item__name">{{ getItemName(item) }}</span>
              <span class="order-item__quantity">{{ getQuantityText(item) }}</span>
              <strong class="order-item__subtotal">¥{{ formatCurrency(getItemSubtotal(item)) }}</strong>
            </div>
          </div>

          <div class="order-card__details">
            <span>订单类型：{{ getTypeText(order.type) }}</span>
            <span v-if="order.address">地址信息：{{ order.address }}</span>
            <span v-if="order.phone">联系电话：{{ order.phone }}</span>
            <span v-if="order.remark">备注：{{ order.remark }}</span>
          </div>

          <div class="order-card__footer">
            <span class="order-card__hint">{{ getOrderHint(order) }}</span>
            <el-button
              v-if="canPay(order)"
              type="primary"
              :loading="Boolean(payingMap[orderKey(order)])"
              @click="payOrder(order)"
            >
              去支付
            </el-button>
            <el-button
              v-if="order.status === 'pending' && !isPaid(order)"
              type="danger"
              plain
              :loading="Boolean(cancellingMap[orderKey(order)])"
              @click="cancelOrder(order)"
            >
              取消订单
            </el-button>
          </div>
        </article>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import { drivingSchoolApi, secondhandApi, snackApi, supermarketApi, tutorApi } from '@/api'
import { useRouter } from 'vue-router'
import { startPaymentByOrderId } from '@/utils/paymentFlow'

const loading = ref(false)
const hasLoaded = ref(false)
const activeType = ref('all')
const statusFilter = ref('')
const cancellingMap = ref({})
const payingMap = ref({})
const router = useRouter()

const orderApiMap = {
  snack: snackApi,
  supermarket: supermarketApi,
  tutor: tutorApi,
  secondhand: secondhandApi,
  driving_school: drivingSchoolApi
}

const orderBuckets = reactive({
  snack: [],
  supermarket: [],
  tutor: [],
  secondhand: [],
  driving_school: []
})

const typeOptions = [
  { value: 'all', label: '全部' },
  { value: 'snack', label: '小吃摊' },
  { value: 'supermarket', label: '校园超市' },
  { value: 'tutor', label: '家教' },
  { value: 'secondhand', label: '二手交易' },
  { value: 'driving_school', label: '驾校' }
]

const typeTextMap = {
  all: '全部订单',
  snack: '小吃摊订单',
  supermarket: '校园超市订单',
  tutor: '家教订单',
  secondhand: '二手交易订单',
  driving_school: '驾校订单'
}

const statusTextMap = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusTypeMap = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  cancelled: 'info'
}

const typeTagTypeMap = {
  snack: 'warning',
  supermarket: 'primary',
  tutor: 'success',
  secondhand: 'danger',
  driving_school: 'info'
}

const normalizeItems = (items) => {
  if (Array.isArray(items)) {
    return items
  }

  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('解析订单内容失败:', error)
    }
  }

  return []
}

const normalizeOrder = (item, type) => ({
  ...item,
  type: item.type || type,
  items: normalizeItems(item.items),
  totalAmount: Number(item.totalAmount ?? item.total_amount ?? 0),
  createdAt: item.createdAt ?? item.created_at ?? ''
})

const getOrderTimestamp = (order) => {
  if (!order.createdAt) {
    return 0
  }

  const timestamp = new Date(order.createdAt).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const allOrders = computed(() => {
  return Object.values(orderBuckets)
    .flat()
    .slice()
    .sort((left, right) => {
      const timeDiff = getOrderTimestamp(right) - getOrderTimestamp(left)

      if (timeDiff !== 0) {
        return timeDiff
      }

      return Number(right.id || 0) - Number(left.id || 0)
    })
})

const filteredOrders = computed(() => {
  return allOrders.value.filter((order) => {
    if (activeType.value !== 'all' && order.type !== activeType.value) {
      return false
    }

    if (statusFilter.value && order.status !== statusFilter.value) {
      return false
    }

    return true
  })
})

const activeTypeText = computed(() => typeTextMap[activeType.value] || '订单')

const orderSummary = computed(() => ({
  total: allOrders.value.length,
  pending: allOrders.value.filter((order) => order.status === 'pending').length
}))

const orderKey = (order) => `${order.type}-${order.id}`

const getTypeText = (type) => typeTextMap[type] || '订单'

const getTypeTagType = (type) => typeTagTypeMap[type] || 'info'

const getStatusText = (status) => statusTextMap[status] || status || '未知状态'

const getStatusType = (status) => statusTypeMap[status] || 'info'

const getPaymentStatus = (order) => order?.paymentStatus ?? order?.payment_status ?? 'unpaid'

const isPaid = (order) => getPaymentStatus(order) === 'paid'

const getPaymentStatusText = (status) => {
  if (status === 'paid') return '已支付'
  if (status === 'unpaid') return '未支付'
  if (status === 'refunded') return '已退款'
  return status || '未知'
}

const getPaymentStatusType = (status) => {
  if (status === 'paid') return 'success'
  if (status === 'unpaid') return 'warning'
  if (status === 'refunded') return 'info'
  return 'info'
}

const getItemName = (item) => {
  return item.snackName || item.productName || item.tutorName || item.title || item.schoolName || '未命名内容'
}

const getQuantityText = (item) => {
  if (item.unit) {
    return `${Number(item.quantity || 0)}${item.unit}`
  }

  return `x${Number(item.quantity || 1)}`
}

const getItemSubtotal = (item) => {
  if (typeof item.subtotal !== 'undefined') {
    return Number(item.subtotal || 0)
  }

  return Number(item.price || 0) * Number(item.quantity || 0)
}

const formatCurrency = (value) => Number(value || 0).toFixed(2)

const formatTime = (value) => {
  if (!value) {
    return '暂无时间信息'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getOrderHint = (order) => {
  const status = order?.status
  const paymentStatus = getPaymentStatus(order || {})

  if (paymentStatus !== 'paid' && status !== 'cancelled' && status !== 'completed') {
    return '订单待支付，完成支付后将进入处理流程。'
  }

  if (status === 'pending') {
    return '订单提交成功，平台处理前支持主动取消。'
  }

  if (status === 'processing') {
    return '订单正在处理中，当前状态下不支持取消。'
  }

  if (status === 'completed') {
    return '订单已完成，如有问题可联系管理员处理。'
  }

  if (status === 'cancelled') {
    return '订单已取消，不会继续进入处理流程。'
  }

  return '订单状态已更新。'
}

const canPay = (order) => {
  if (!order) return false
  if (order.status === 'cancelled' || order.status === 'completed') return false
  return getPaymentStatus(order) !== 'paid'
}

const replaceOrder = (type, updatedOrder) => {
  const normalized = normalizeOrder(updatedOrder, type)
  orderBuckets[type] = orderBuckets[type].map((item) => {
    return Number(item.id) === Number(normalized.id) ? normalized : item
  })
}

const payOrder = async (order) => {
  const key = orderKey(order)
  payingMap.value = {
    ...payingMap.value,
    [key]: true
  }

  try {
    await startPaymentByOrderId(order.id, router)
  } catch (error) {
    console.error('创建支付单失败:', error)
  } finally {
    const nextMap = { ...payingMap.value }
    delete nextMap[key]
    payingMap.value = nextMap
  }
}

const loadOrders = async () => {
  loading.value = true

  try {
    const entries = Object.entries(orderApiMap)
    const results = await Promise.allSettled(entries.map(([, api]) => api.getOrders()))

    entries.forEach(([type], index) => {
      const result = results[index]

      if (result.status === 'fulfilled') {
        orderBuckets[type] = Array.isArray(result.value.data)
          ? result.value.data.map((item) => normalizeOrder(item, type))
          : []
      } else {
        console.error(`加载 ${type} 订单失败:`, result.reason)
      }
    })

    hasLoaded.value = true
  } finally {
    loading.value = false
  }
}

const cancelOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确认取消订单 #${order.id} 吗？取消后将无法继续处理。`,
      '取消订单',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '暂不取消',
        type: 'warning'
      }
    )
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    console.error('取消订单确认弹窗失败:', error)
    return
  }

  const key = orderKey(order)
  cancellingMap.value = {
    ...cancellingMap.value,
    [key]: true
  }

  try {
    const result = await orderApiMap[order.type].cancelOrder(order.id)

    if (result?.data) {
      replaceOrder(order.type, result.data)
    }

    ElMessage.success(result?.message || '订单已取消')
  } catch (error) {
    console.error('取消订单失败:', error)
  } finally {
    const nextMap = { ...cancellingMap.value }
    delete nextMap[key]
    cancellingMap.value = nextMap
  }
}

onMounted(() => {
  loadOrders()
})

onActivated(() => {
  if (hasLoaded.value) {
    loadOrders()
  }
})
</script>

<style scoped>
.orders-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 22px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.58));
}

.summary-card span,
.summary-card small {
  display: block;
}

.summary-card span {
  color: var(--app-text-soft);
  font-size: 14px;
}

.summary-card strong {
  display: block;
  margin: 10px 0 8px;
  font-size: 32px;
  line-height: 1;
  color: #10213f;
}

.summary-card small {
  color: var(--app-text-soft);
  line-height: 1.6;
}

.summary-card--pending {
  background: linear-gradient(135deg, rgba(255, 244, 227, 0.95), rgba(255, 250, 240, 0.72));
}

.summary-card--type {
  background: linear-gradient(135deg, rgba(236, 244, 255, 0.94), rgba(242, 248, 255, 0.72));
}

.orders-card {
  overflow: hidden;
}

.card-header__copy p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 255, 0.78));
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.order-card--snack {
  border-left: 5px solid rgba(230, 162, 60, 0.9);
}

.order-card--supermarket {
  border-left: 5px solid rgba(79, 124, 255, 0.88);
}

.order-card--tutor {
  border-left: 5px solid rgba(103, 194, 58, 0.9);
}

.order-card--secondhand {
  border-left: 5px solid rgba(245, 108, 108, 0.9);
}

.order-card--driving_school {
  border-left: 5px solid rgba(144, 147, 153, 0.9);
}

.order-card__header,
.order-card__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.order-card__header h3 {
  margin: 12px 0 8px;
  font-size: 20px;
  color: #13213f;
}

.order-card__header p {
  margin: 0;
  color: var(--app-text-soft);
}

.order-card__badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.order-card__amount {
  min-width: 132px;
  text-align: right;
}

.order-card__amount span {
  display: block;
  color: var(--app-text-soft);
  font-size: 13px;
}

.order-card__amount strong {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  color: #ef4444;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 18px 0;
  padding: 16px;
  border-radius: 18px;
  background: rgba(241, 245, 255, 0.7);
}

.order-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}

.order-item__name {
  font-weight: 600;
  color: #1f2e4b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-item__quantity {
  color: var(--app-text-soft);
}

.order-item__subtotal {
  color: #ef4444;
}

.order-card__details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.order-card__details span {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.order-card__footer {
  margin-top: 18px;
  align-items: center;
}

.order-card__hint {
  color: var(--app-text-soft);
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .summary-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header__actions,
  .order-card__header,
  .order-card__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .order-card__amount {
    text-align: left;
  }

  .order-item {
    grid-template-columns: 1fr auto;
  }

  .order-item__subtotal {
    grid-column: 1 / -1;
  }
}
</style>

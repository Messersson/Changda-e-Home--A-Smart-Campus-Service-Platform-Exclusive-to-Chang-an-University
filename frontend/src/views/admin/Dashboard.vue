<template>
  <div class="dashboard-page">
    <section class="dashboard-hero glass-panel">
      <div>
        <div class="brand-chip brand-chip--dark">Admin Overview</div>
        <h2>校园服务运营总览</h2>
        <p>在同一视图中掌握用户规模、订单流转和内容资产分布，让管理更高效。</p>
      </div>
      <div class="hero-pills">
        <div class="hero-pill glass-panel">
          <strong>{{ totalCoreAssets }}</strong>
          <span>核心内容资产</span>
        </div>
        <div class="hero-pill glass-panel">
          <strong>{{ totalOrders }}</strong>
          <span>订单总量</span>
        </div>
        <div class="hero-pill glass-panel">
          <strong>¥{{ formatCurrency(stats.totalRevenue) }}</strong>
          <span>已支付收入</span>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article v-for="card in statCards" :key="card.key" class="stat-card glass-panel">
        <div class="stat-card__head">
          <div class="stat-card__icon" :class="card.theme">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
          <span class="stat-card__tag">{{ card.tag }}</span>
        </div>
        <div class="stat-card__value">{{ card.value }}</div>
        <div class="stat-card__label">{{ card.label }}</div>
      </article>
    </section>

    <el-row :gutter="20" class="dashboard-panels">
      <el-col :xs="24" :lg="15">
        <div class="dashboard-panel glass-panel">
          <div class="section-title dashboard-panel__title">
            <div>
              <h2>模块分布</h2>
              <p>快速了解各类内容和业务数据规模。</p>
            </div>
          </div>

          <div class="metric-list">
            <div v-for="item in distributionItems" :key="item.label" class="metric-item">
              <div class="metric-item__header">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
              <div class="metric-item__bar">
                <span :style="{ width: `${item.ratio}%` }"></span>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :lg="9">
        <div class="dashboard-panel glass-panel">
          <div class="section-title dashboard-panel__title">
            <div>
              <h2>管理建议</h2>
              <p>基于当前模块数据量生成的操作重点。</p>
            </div>
          </div>

          <div class="insight-list">
            <div class="insight-item">
              <strong>优先关注订单流转</strong>
              <p>当前待处理订单 {{ stats.pendingOrderCount }}，处理中订单 {{ stats.processingOrderCount }}，建议持续跟踪处理时效。</p>
            </div>
            <div class="insight-item">
              <strong>维持内容活跃度</strong>
              <p>论坛、资料、家教与二手信息需保持更新，增强平台粘性。</p>
            </div>
            <div class="insight-item">
              <strong>关注新增用户承接</strong>
              <p>当前注册用户 {{ stats.userCount }} 人，可继续优化新用户首登体验。</p>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '@/api'
import { User, Bowl, ShoppingCart, Reading, Goods, ChatDotRound, Document, Van } from '@element-plus/icons-vue'

const stats = ref({
  userCount: 0,
  orderCount: 0,
  tutorCount: 0,
  secondhandCount: 0,
  forumPostCount: 0,
  studyMaterialCount: 0,
  drivingSchoolCount: 0,
  drivingInquiryCount: 0,
  snackOrderCount: 0,
  supermarketOrderCount: 0,
  tutorOrderCount: 0,
  secondhandOrderCount: 0,
  drivingSchoolOrderCount: 0,
  pendingOrderCount: 0,
  processingOrderCount: 0,
  completedOrderCount: 0,
  cancelledOrderCount: 0,
  paidOrderCount: 0,
  unpaidOrderCount: 0,
  totalRevenue: 0
})

const numberValue = (value) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const responseData = (response) => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data
  }

  return response
}

const listData = (response) => {
  const data = responseData(response)
  return Array.isArray(data) ? data : []
}

const totalOrders = computed(() => {
  const explicitTotal = numberValue(stats.value.orderCount)
  if (explicitTotal > 0) {
    return explicitTotal
  }

  return orderTypeItems.value.reduce((sum, item) => sum + item.value, 0)
})

const totalCoreAssets = computed(() => {
  return [
    numberValue(stats.value.tutorCount),
    numberValue(stats.value.secondhandCount),
    numberValue(stats.value.forumPostCount),
    numberValue(stats.value.studyMaterialCount),
    numberValue(stats.value.drivingSchoolCount),
    numberValue(stats.value.drivingInquiryCount)
  ].reduce((sum, current) => sum + current, 0)
})

const orderTypeItems = computed(() => [
  { label: '小吃订单', value: numberValue(stats.value.snackOrderCount) },
  { label: '超市订单', value: numberValue(stats.value.supermarketOrderCount) },
  { label: '家教订单', value: numberValue(stats.value.tutorOrderCount) },
  { label: '二手订单', value: numberValue(stats.value.secondhandOrderCount) },
  { label: '驾校订单', value: numberValue(stats.value.drivingSchoolOrderCount) }
])

const statCards = computed(() => [
  { key: 'users', label: '注册用户', value: numberValue(stats.value.userCount), icon: User, theme: 'theme-users', tag: 'Users' },
  { key: 'orders', label: '订单总量', value: totalOrders.value, icon: ShoppingCart, theme: 'theme-market', tag: 'Orders' },
  { key: 'assets', label: '核心内容资产', value: totalCoreAssets.value, icon: Document, theme: 'theme-material', tag: 'Assets' },
  { key: 'snackOrders', label: '小吃订单', value: numberValue(stats.value.snackOrderCount), icon: Bowl, theme: 'theme-snack', tag: 'Snack' },
  { key: 'supermarketOrders', label: '超市订单', value: numberValue(stats.value.supermarketOrderCount), icon: ShoppingCart, theme: 'theme-market', tag: 'Market' },
  { key: 'pendingOrders', label: '待处理订单', value: numberValue(stats.value.pendingOrderCount), icon: Bowl, theme: 'theme-snack', tag: 'Pending' },
  { key: 'paidOrders', label: '已支付订单', value: numberValue(stats.value.paidOrderCount), icon: ShoppingCart, theme: 'theme-market', tag: 'Paid' },
  { key: 'tutor', label: '家教信息', value: numberValue(stats.value.tutorCount), icon: Reading, theme: 'theme-tutor', tag: 'Tutor' },
  { key: 'secondhand', label: '二手商品', value: numberValue(stats.value.secondhandCount), icon: Goods, theme: 'theme-secondhand', tag: 'Trade' },
  { key: 'forum', label: '论坛帖子', value: numberValue(stats.value.forumPostCount), icon: ChatDotRound, theme: 'theme-forum', tag: 'Forum' },
  { key: 'material', label: '学习资料', value: numberValue(stats.value.studyMaterialCount), icon: Document, theme: 'theme-material', tag: 'Material' },
  { key: 'driving', label: '驾校信息', value: numberValue(stats.value.drivingSchoolCount), icon: Van, theme: 'theme-driving', tag: 'Driving' },
  { key: 'inquiry', label: '驾校咨询', value: numberValue(stats.value.drivingInquiryCount), icon: ChatDotRound, theme: 'theme-inquiry', tag: 'Inquiry' }
])

const distributionItems = computed(() => {
  const items = [
    ...orderTypeItems.value,
    { label: '待处理订单', value: numberValue(stats.value.pendingOrderCount) },
    { label: '处理中订单', value: numberValue(stats.value.processingOrderCount) },
    { label: '已完成订单', value: numberValue(stats.value.completedOrderCount) },
    { label: '已取消订单', value: numberValue(stats.value.cancelledOrderCount) },
    { label: '论坛帖子', value: numberValue(stats.value.forumPostCount) },
    { label: '学习资料', value: numberValue(stats.value.studyMaterialCount) },
    { label: '家教信息', value: numberValue(stats.value.tutorCount) },
    { label: '二手商品', value: numberValue(stats.value.secondhandCount) },
    { label: '驾校信息', value: numberValue(stats.value.drivingSchoolCount) },
    { label: '驾校咨询', value: numberValue(stats.value.drivingInquiryCount) }
  ]

  const max = Math.max(...items.map((item) => item.value), 1)

  return items.map((item) => ({
    ...item,
    ratio: Math.max(12, Math.round((item.value / max) * 100))
  }))
})

const loadStats = async () => {
  await loadStatsSummary()
  await fillOrderStatsFromOrders()
  await fillContentAssetStats()
}

const loadStatsSummary = async () => {
  try {
    const res = await adminApi.getStats()
    const data = responseData(res)
    stats.value = {
      ...stats.value,
      ...(data || {})
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const fillOrderStatsFromOrders = async () => {
  if (
    totalOrders.value > 0 &&
    orderTypeItems.value.some((item) => item.value > 0) &&
    [
      stats.value.pendingOrderCount,
      stats.value.processingOrderCount,
      stats.value.completedOrderCount,
      stats.value.cancelledOrderCount
    ].some((value) => numberValue(value) > 0)
  ) {
    return
  }

  try {
    const res = await adminApi.getOrders({})
    const orders = listData(res)
    const nextStats = {
      orderCount: orders.length,
      snackOrderCount: 0,
      supermarketOrderCount: 0,
      tutorOrderCount: 0,
      secondhandOrderCount: 0,
      drivingSchoolOrderCount: 0,
      pendingOrderCount: 0,
      processingOrderCount: 0,
      completedOrderCount: 0,
      cancelledOrderCount: 0,
      paidOrderCount: 0,
      unpaidOrderCount: 0
    }

    orders.forEach((order) => {
      if (order.type === 'snack') nextStats.snackOrderCount += 1
      if (order.type === 'supermarket') nextStats.supermarketOrderCount += 1
      if (order.type === 'tutor') nextStats.tutorOrderCount += 1
      if (order.type === 'secondhand') nextStats.secondhandOrderCount += 1
      if (order.type === 'driving_school') nextStats.drivingSchoolOrderCount += 1

      if (order.status === 'pending') nextStats.pendingOrderCount += 1
      if (order.status === 'processing') nextStats.processingOrderCount += 1
      if (order.status === 'completed') nextStats.completedOrderCount += 1
      if (order.status === 'cancelled') nextStats.cancelledOrderCount += 1

      if (order.paymentStatus === 'paid' || order.payment_status === 'paid') {
        nextStats.paidOrderCount += 1
      }
      if (order.paymentStatus === 'unpaid' || order.payment_status === 'unpaid') {
        nextStats.unpaidOrderCount += 1
      }
    })

    stats.value = {
      ...stats.value,
      ...nextStats
    }
  } catch (error) {
    console.error('加载订单兜底统计失败:', error)
  }
}

const fillContentAssetStats = async () => {
  if (totalCoreAssets.value > 0) {
    return
  }

  try {
    const [
      tutors,
      secondhandItems,
      forumPosts,
      studyMaterials,
      drivingSchools,
      drivingInquiries
    ] = await Promise.allSettled([
      adminApi.getTutors({}),
      adminApi.getSecondhandItems({}),
      adminApi.getForumPosts({}),
      adminApi.getStudyMaterials({}),
      adminApi.getDrivingSchools({}),
      adminApi.getDrivingInquiries()
    ])

    const countResult = (result) => {
      if (result.status !== 'fulfilled') {
        return 0
      }
      return listData(result.value).length
    }

    stats.value = {
      ...stats.value,
      tutorCount: countResult(tutors),
      secondhandCount: countResult(secondhandItems),
      forumPostCount: countResult(forumPosts),
      studyMaterialCount: countResult(studyMaterials),
      drivingSchoolCount: countResult(drivingSchools),
      drivingInquiryCount: countResult(drivingInquiries)
    }
  } catch (error) {
    console.error('加载内容资产兜底统计失败:', error)
  }
}

const formatCurrency = (value) => numberValue(value).toFixed(2)

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-page {
  padding: 0;
}

.dashboard-hero {
  padding: 28px;
  border-radius: var(--app-radius-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.14), rgba(123, 97, 255, 0.12));
}

.dashboard-hero h2 {
  margin: 14px 0 10px;
  font-size: 30px;
  color: #14213d;
}

.dashboard-hero p {
  margin: 0;
  color: var(--app-text-soft);
}

.hero-pills {
  display: flex;
  gap: 14px;
}

.hero-pill {
  min-width: 150px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.hero-pill strong {
  display: block;
  font-size: 30px;
  color: var(--app-primary);
}

.hero-pill span {
  color: var(--app-text-soft);
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
}

.stat-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.stat-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 24px;
  color: #fff;
}

.stat-card__tag {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #64748b;
  font-size: 12px;
}

.stat-card__value {
  font-size: 34px;
  font-weight: 800;
  color: #172554;
  margin-bottom: 8px;
}

.stat-card__label {
  color: var(--app-text-soft);
}

.theme-users { background: linear-gradient(135deg, #4f7cff, #7b61ff); }
.theme-snack { background: linear-gradient(135deg, #ff7a59, #ffb347); }
.theme-market { background: linear-gradient(135deg, #00b4d8, #48cae4); }
.theme-tutor { background: linear-gradient(135deg, #22c55e, #2dd4bf); }
.theme-secondhand { background: linear-gradient(135deg, #fb7185, #f59e0b); }
.theme-forum { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.theme-material { background: linear-gradient(135deg, #0ea5e9, #38bdf8); }
.theme-driving { background: linear-gradient(135deg, #ec4899, #a855f7); }
.theme-inquiry { background: linear-gradient(135deg, #14b8a6, #22c55e); }

.dashboard-panels {
  margin-top: 0;
}

.dashboard-panel {
  height: 100%;
  padding: 24px;
  border-radius: var(--app-radius-xl);
  background: rgba(255, 255, 255, 0.74);
}

.dashboard-panel__title {
  margin-bottom: 20px;
}

.metric-list,
.insight-list {
  display: grid;
  gap: 16px;
}

.metric-item__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #334155;
}

.metric-item__bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  overflow: hidden;
}

.metric-item__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #4f7cff, #7b61ff);
}

.insight-item {
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.08), rgba(0, 194, 168, 0.08));
}

.insight-item strong {
  display: block;
  margin-bottom: 8px;
  color: #162441;
}

.insight-item p {
  margin: 0;
  line-height: 1.7;
  color: var(--app-text-soft);
}

@media (max-width: 960px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-pills {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .hero-pills {
    flex-direction: column;
  }
}
</style>

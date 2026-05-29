<template>
  <div class="merchant-dashboard" v-loading="loading">
    <section class="stats-grid">
      <el-card v-for="item in statCards" :key="item.key" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </el-card>
    </section>

    <el-card class="profile-card">
      <template #header>店铺认证信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="店铺名称">{{ profile.storeName }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ profile.contactName }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ profile.phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ profile.email }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ profile.address }}</el-descriptions-item>
        <el-descriptions-item label="简介" :span="2">{{ profile.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { merchantApi } from '@/api'

const loading = ref(false)
const stats = ref({})
const profile = ref({})

const statCards = computed(() => [
  { key: 'snacks', label: '小吃商品', value: stats.value.snackCount || 0 },
  { key: 'products', label: '超市商品', value: stats.value.productCount || 0 },
  { key: 'orders', label: '商家订单', value: stats.value.orderCount || 0 },
  { key: 'afterSales', label: '待处理售后', value: stats.value.pendingAfterSaleCount || 0 },
  { key: 'revenue', label: '已支付营业额', value: `￥${Number(stats.value.revenue || 0).toFixed(2)}` }
])

const loadDashboard = async () => {
  loading.value = true
  try {
    const result = await merchantApi.getDashboard()
    stats.value = result.data || {}
    profile.value = result.data?.profile || {}
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.merchant-dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.stat-card span,
.stat-card strong {
  display: block;
}

.stat-card span {
  color: #64748b;
}

.stat-card strong {
  margin-top: 10px;
  font-size: 28px;
  color: #13213f;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

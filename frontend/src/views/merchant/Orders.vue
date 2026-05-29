<template>
  <div class="merchant-orders-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <div class="filters">
            <el-select v-model="filterType" placeholder="类型" style="width: 140px" @change="loadOrders">
              <el-option label="全部" value="" />
              <el-option label="小吃" value="snack" />
              <el-option label="超市" value="supermarket" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" style="width: 140px" @change="loadOrders">
              <el-option label="全部" value="" />
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="orders" stripe v-loading="loading">
        <el-table-column prop="id" label="订单ID" width="90" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ row.type === 'snack' ? '小吃' : '超市' }}</template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="110" />
        <el-table-column prop="customerPhone" label="电话" width="130" />
        <el-table-column prop="customerAddress" label="地址" min-width="170" />
        <el-table-column label="商品" min-width="220">
          <template #default="{ row }">
            <div class="item-list">
              <span v-for="(item, index) in row.items" :key="index">
                {{ item.snackName || item.productName }} x{{ item.quantity }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="100">
          <template #default="{ row }">￥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="primary" @click="updateStatus(row, 'processing')">
              接单
            </el-button>
            <el-button v-if="row.status === 'processing'" size="small" type="success" @click="updateStatus(row, 'completed')">
              完成
            </el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="updateStatus(row, 'cancelled')">
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { merchantApi } from '@/api'

const orders = ref([])
const loading = ref(false)
const filterType = ref('')
const filterStatus = ref('')

const statusTextMap = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
  returned: '已退货'
}

const statusType = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'processing') return 'primary'
  if (status === 'cancelled' || status === 'refunded' || status === 'returned') return 'info'
  return 'warning'
}

const statusText = (status) => statusTextMap[status] || status

const normalizeOrder = (row) => ({
  ...row,
  items: Array.isArray(row.items) ? row.items : [],
  totalAmount: Number(row.totalAmount || row.total_amount || 0)
})

const loadOrders = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    const result = await merchantApi.getOrders(params)
    orders.value = Array.isArray(result.data) ? result.data.map(normalizeOrder) : []
  } finally {
    loading.value = false
  }
}

const updateStatus = async (row, status) => {
  await merchantApi.updateOrderStatus(row.id, { status })
  ElMessage.success('订单状态已更新')
  loadOrders()
}

onMounted(loadOrders)
</script>

<style scoped>
.card-header,
.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>

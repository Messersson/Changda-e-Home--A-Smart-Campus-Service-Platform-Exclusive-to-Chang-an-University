<template>
  <div class="orders-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <div class="filter-actions">
            <el-select v-model="filterType" placeholder="订单类型" style="width: 140px" @change="loadOrders">
              <el-option label="全部" value="" />
              <el-option label="小吃摊" value="snack" />
              <el-option label="校园超市" value="supermarket" />
              <el-option label="家教" value="tutor" />
              <el-option label="二手交易" value="secondhand" />
              <el-option label="驾校" value="driving_school" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="订单状态" style="width: 120px" @change="loadOrders">
              <el-option label="全部" value="" />
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="orders" stripe>
        <el-table-column prop="id" label="订单ID" width="90" />
        <el-table-column label="订单类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单内容" min-width="320">
          <template #default="{ row }">
            <div class="order-items">
              <span v-for="(item, index) in row.items" :key="`${row.id}-${index}`">
                {{ getItemName(item) }} {{ getQuantityText(item) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="订单金额" width="110">
          <template #default="{ row }">¥{{ formatCurrency(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="订单状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="180">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="updateStatus(row, 'processing')">
              接单
            </el-button>
            <el-button v-if="row.status === 'processing'" type="success" size="small" @click="updateStatus(row, 'completed')">
              完成
            </el-button>
            <el-button v-if="row.status === 'pending'" type="danger" size="small" @click="updateStatus(row, 'cancelled')">
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
import { adminApi } from '@/api'

const orders = ref([])
const filterType = ref('')
const filterStatus = ref('')

const statusTextMap = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消'
}

const typeTextMap = {
  snack: '小吃摊',
  supermarket: '校园超市',
  tutor: '家教',
  secondhand: '二手交易',
  driving_school: '驾校'
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

const normalizeOrder = (item) => ({
  ...item,
  totalAmount: Number(item.totalAmount ?? item.total_amount ?? 0),
  items: normalizeItems(item.items),
  createdAt: item.createdAt ?? item.created_at ?? ''
})

const loadOrders = async () => {
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await adminApi.getOrders(params)
    orders.value = (Array.isArray(res.data) ? res.data : []).map(normalizeOrder)
  } catch (error) {
    console.error('加载订单列表失败:', error)
  }
}

const getTypeText = (type) => typeTextMap[type] || type || '订单'

const getTypeTagType = (type) => typeTagTypeMap[type] || 'info'

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => statusTextMap[status] || status

const getItemName = (item) => {
  return item.snackName || item.productName || item.tutorName || item.title || item.schoolName || '未命名内容'
}

const getQuantityText = (item) => {
  if (item.unit) {
    return `${Number(item.quantity || 0)}${item.unit}`
  }

  return `x${Number(item.quantity || 1)}`
}

const formatCurrency = (value) => Number(value || 0).toFixed(2)

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN')
}

const updateStatus = async (order, status) => {
  try {
    await adminApi.updateOrderStatus(order.id, { status })
    order.status = status
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新订单状态失败:', error)
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.orders-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.order-items span {
  font-size: 12px;
  color: #666;
}
</style>

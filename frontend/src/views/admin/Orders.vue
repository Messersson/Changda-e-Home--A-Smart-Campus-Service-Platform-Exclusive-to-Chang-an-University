<template>
  <div class="orders-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>订单管理</span>
          <div class="filter-actions">
            <el-select v-model="filterType" placeholder="订单类型" style="width: 120px" @change="loadOrders">
              <el-option label="全部" value="" />
              <el-option label="小吃摊" value="snack" />
              <el-option label="超市" value="supermarket" />
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
        <el-table-column prop="id" label="订单ID" width="80" />
        <el-table-column label="订单类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'snack' ? 'warning' : 'primary'">
              {{ row.type === 'snack' ? '小吃摊' : '超市' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单内容" min-width="300">
          <template #default="{ row }">
            <div class="order-items">
              <span v-for="(item, index) in row.items" :key="index">
                {{ item.snackName || item.productName }} x{{ item.quantity }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="订单金额" width="100">
          <template #default="{ row }">¥{{ row.totalAmount.toFixed(2) }}</template>
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
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="updateStatus(row, 'processing')">接单</el-button>
            <el-button v-if="row.status === 'processing'" type="success" size="small" @click="updateStatus(row, 'completed')">完成</el-button>
            <el-button v-if="row.status === 'pending'" type="danger" size="small" @click="updateStatus(row, 'cancelled')">取消</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api'

const orders = ref([])
const filterType = ref('')
const filterStatus = ref('')

const loadOrders = async () => {
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await adminApi.getOrders(params)
    orders.value = res.data
  } catch (error) {
    console.error('加载订单列表失败:', error)
  }
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
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

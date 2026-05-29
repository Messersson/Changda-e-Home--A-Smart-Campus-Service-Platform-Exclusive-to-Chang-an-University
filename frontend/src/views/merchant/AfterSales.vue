<template>
  <div class="merchant-after-sales-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>退款退货申请</span>
          <el-select v-model="filterStatus" style="width: 170px" @change="loadAfterSales">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="商家同意" value="merchant_approved" />
            <el-option label="商家拒绝" value="merchant_rejected" />
            <el-option label="平台同意" value="admin_approved" />
            <el-option label="平台拒绝" value="admin_rejected" />
          </el-select>
        </div>
      </template>

      <el-table :data="rows" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="orderId" label="订单" width="90" />
        <el-table-column prop="customerName" label="客户" width="110" />
        <el-table-column prop="customerPhone" label="电话" width="130" />
        <el-table-column prop="type" label="类型" width="90">
          <template #default="{ row }">{{ row.type === 'return' ? '退货' : '退款' }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="180" />
        <el-table-column prop="merchantReply" label="商家说明" min-width="160" />
        <el-table-column prop="adminReply" label="平台说明" min-width="160" />
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click="handle(row, 'approved')">同意</el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="handle(row, 'rejected')">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { merchantApi } from '@/api'

const rows = ref([])
const loading = ref(false)
const filterStatus = ref('')

const statusTextMap = {
  pending: '待处理',
  merchant_approved: '商家同意',
  merchant_rejected: '商家拒绝',
  admin_approved: '平台同意',
  admin_rejected: '平台拒绝',
  completed: '已完成'
}

const statusText = (status) => statusTextMap[status] || status

const statusType = (status) => {
  if (['merchant_approved', 'admin_approved', 'completed'].includes(status)) return 'success'
  if (['merchant_rejected', 'admin_rejected'].includes(status)) return 'danger'
  return 'warning'
}

const loadAfterSales = async () => {
  loading.value = true
  try {
    const params = filterStatus.value ? { status: filterStatus.value } : {}
    const result = await merchantApi.getAfterSales(params)
    rows.value = Array.isArray(result.data) ? result.data : []
  } finally {
    loading.value = false
  }
}

const handle = async (row, status) => {
  const label = status === 'approved' ? '同意' : '拒绝'
  const { value } = await ElMessageBox.prompt(`请输入${label}说明`, '处理售后申请', {
    confirmButtonText: label,
    cancelButtonText: '取消'
  })
  await merchantApi.handleAfterSale(row.id, { status, reply: value || label })
  ElMessage.success('售后申请已处理，等待平台最终裁决')
  loadAfterSales()
}

onMounted(loadAfterSales)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>

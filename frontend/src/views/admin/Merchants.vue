<template>
  <div class="admin-merchants-page">
    <el-tabs v-model="activeTab" class="merchant-tabs" @tab-change="loadCurrentTab">
      <el-tab-pane label="入驻审核" name="applications">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>商家入驻申请</span>
              <el-select v-model="applicationStatus" style="width: 140px" @change="loadApplications">
                <el-option label="全部" value="" />
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已驳回" value="rejected" />
              </el-select>
            </div>
          </template>

          <el-table :data="applications" stripe>
            <el-table-column prop="storeName" label="店铺" min-width="150" />
            <el-table-column prop="contactName" label="联系人" width="110" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="email" label="邮箱" min-width="170" />
            <el-table-column prop="address" label="地址" min-width="180" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" type="success" size="small" @click="approve(row)">
                  通过
                </el-button>
                <el-button v-if="row.status === 'pending'" type="danger" size="small" @click="reject(row)">
                  驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="商家账号" name="accounts">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>商家账号管理</span>
              <el-select v-model="merchantStatus" style="width: 140px" @change="loadMerchants">
                <el-option label="全部" value="" />
                <el-option label="启用" value="active" />
                <el-option label="停用" value="disabled" />
              </el-select>
            </div>
          </template>

          <el-table :data="merchants" stripe>
            <el-table-column prop="storeName" label="店铺" min-width="150" />
            <el-table-column prop="contactName" label="联系人" width="110" />
            <el-table-column prop="phone" label="电话" width="130" />
            <el-table-column prop="email" label="邮箱" min-width="170" />
            <el-table-column prop="address" label="地址" min-width="180" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" @click="toggleMerchant(row)">
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="售后裁决" name="afterSales">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>退款退货最终裁决</span>
              <el-select v-model="afterSaleStatus" style="width: 170px" @change="loadAfterSales">
                <el-option label="全部" value="" />
                <el-option label="待商家处理" value="pending" />
                <el-option label="商家同意" value="merchant_approved" />
                <el-option label="商家拒绝" value="merchant_rejected" />
                <el-option label="平台同意" value="admin_approved" />
                <el-option label="平台拒绝" value="admin_rejected" />
              </el-select>
            </div>
          </template>

          <el-table :data="afterSales" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="storeName" label="商家" min-width="140" />
            <el-table-column prop="customerName" label="客户" width="110" />
            <el-table-column prop="orderId" label="订单" width="90" />
            <el-table-column prop="type" label="类型" width="90" />
            <el-table-column prop="reason" label="原因" min-width="180" />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" @click="decide(row, 'approved')">同意</el-button>
                <el-button size="small" type="danger" @click="decide(row, 'rejected')">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'

const activeTab = ref('applications')
const applicationStatus = ref('pending')
const merchantStatus = ref('')
const afterSaleStatus = ref('')
const applications = ref([])
const merchants = ref([])
const afterSales = ref([])

const statusTextMap = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  active: '启用',
  disabled: '停用',
  merchant_approved: '商家同意',
  merchant_rejected: '商家拒绝',
  admin_approved: '平台同意',
  admin_rejected: '平台拒绝',
  completed: '已完成'
}

const statusText = (status) => statusTextMap[status] || status

const statusType = (status) => {
  if (['approved', 'active', 'merchant_approved', 'admin_approved', 'completed'].includes(status)) return 'success'
  if (['rejected', 'merchant_rejected', 'admin_rejected'].includes(status)) return 'danger'
  if (status === 'pending') return 'warning'
  return 'info'
}

const loadApplications = async () => {
  const params = applicationStatus.value ? { status: applicationStatus.value } : {}
  const result = await adminApi.getMerchantApplications(params)
  applications.value = Array.isArray(result.data) ? result.data : []
}

const loadMerchants = async () => {
  const params = merchantStatus.value ? { status: merchantStatus.value } : {}
  const result = await adminApi.getMerchants(params)
  merchants.value = Array.isArray(result.data) ? result.data : []
}

const loadAfterSales = async () => {
  const params = afterSaleStatus.value ? { status: afterSaleStatus.value } : {}
  const result = await adminApi.getAfterSales(params)
  afterSales.value = Array.isArray(result.data) ? result.data : []
}

const loadCurrentTab = () => {
  if (activeTab.value === 'applications') loadApplications()
  if (activeTab.value === 'accounts') loadMerchants()
  if (activeTab.value === 'afterSales') loadAfterSales()
}

const approve = async (row) => {
  await adminApi.approveMerchantApplication(row.id, { remark: 'approved' })
  ElMessage.success('商家已开通')
  loadApplications()
}

const reject = async (row) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回入驻申请', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '请填写原因'
  })
  await adminApi.rejectMerchantApplication(row.id, { remark: value })
  ElMessage.success('已驳回申请')
  loadApplications()
}

const toggleMerchant = async (row) => {
  const nextStatus = row.status === 'active' ? 'disabled' : 'active'
  await adminApi.updateMerchantStatus(row.id, { status: nextStatus })
  ElMessage.success('商家状态已更新')
  loadMerchants()
}

const decide = async (row, status) => {
  const label = status === 'approved' ? '同意' : '拒绝'
  const { value } = await ElMessageBox.prompt(`请输入${label}说明`, '售后裁决', {
    confirmButtonText: label,
    cancelButtonText: '取消'
  })
  await adminApi.decideAfterSale(row.id, { status, reply: value || label })
  ElMessage.success('售后裁决已更新')
  loadAfterSales()
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.admin-merchants-page {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>

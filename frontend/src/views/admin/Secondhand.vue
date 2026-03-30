<template>
  <div class="secondhand-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>二手交易管理</span>
          <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 120px" @change="loadItems">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="active" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
      </template>
      <el-table :data="items" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="商品标题" width="150" />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="price" label="价格" width="80">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="updateStatus(row, 'active')">通过</el-button>
            <el-button v-if="row.status === 'pending'" type="danger" size="small" @click="updateStatus(row, 'rejected')">拒绝</el-button>
            <el-button size="small" type="danger" @click="deleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'

const items = ref([])
const filterStatus = ref('')

const loadItems = async () => {
  try {
    const params = filterStatus.value ? { status: filterStatus.value } : {}
    const res = await adminApi.getSecondhandItems(params)
    items.value = res.data
  } catch (error) {
    console.error('加载二手商品失败:', error)
  }
}

const getStatusType = (status) => {
  const types = {
    pending: 'warning',
    active: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待审核',
    active: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || status
}

const updateStatus = async (item, status) => {
  try {
    await adminApi.updateSecondhandStatus(item.id, { status })
    item.status = status
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新状态失败:', error)
  }
}

const deleteItem = async (item) => {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteSecondhandItem(item.id)
    ElMessage.success('删除成功')
    loadItems()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

onMounted(() => {
  loadItems()
})
</script>

<style scoped>
.secondhand-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<template>
  <div class="study-materials-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>学习资料管理</span>
          <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 120px" @change="loadMaterials">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="active" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
      </template>
      <el-table :data="materials" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="资料名称" width="150" />
        <el-table-column prop="major" label="专业" width="120" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column prop="subject" label="学科" width="100" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type.toUpperCase() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="80" />
        <el-table-column prop="downloadCount" label="下载次数" width="100" sortable />
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
            <el-button size="small" type="danger" @click="deleteMaterial(row)">删除</el-button>
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

const materials = ref([])
const filterStatus = ref('')

const loadMaterials = async () => {
  try {
    const params = filterStatus.value ? { status: filterStatus.value } : {}
    const res = await adminApi.getStudyMaterials(params)
    materials.value = res.data
  } catch (error) {
    console.error('加载学习资料失败:', error)
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

const updateStatus = async (material, status) => {
  try {
    await adminApi.updateStudyMaterialStatus(material.id, { status })
    material.status = status
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新状态失败:', error)
  }
}

const deleteMaterial = async (material) => {
  try {
    await ElMessageBox.confirm('确定要删除该资料吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteStudyMaterial(material.id)
    ElMessage.success('删除成功')
    loadMaterials()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

onMounted(() => {
  loadMaterials()
})
</script>

<style scoped>
.study-materials-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

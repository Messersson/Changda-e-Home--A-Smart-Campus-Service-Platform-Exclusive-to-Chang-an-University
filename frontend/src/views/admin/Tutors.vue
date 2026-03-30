<template>
  <div class="tutors-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>家教管理</span>
          <el-select v-model="filterStatus" placeholder="筛选状态" style="width: 120px" @change="loadTutors">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="active" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
      </template>
      <el-table :data="tutors" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="subject" label="科目" width="100" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column prop="salary" label="薪资" width="80">
          <template #default="{ row }">¥{{ row.salary }}/小时</template>
        </el-table-column>
        <el-table-column prop="contact" label="联系方式" width="120" />
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
            <el-button size="small" type="danger" @click="deleteTutor(row)">删除</el-button>
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

const tutors = ref([])
const filterStatus = ref('')

const loadTutors = async () => {
  try {
    const res = await adminApi.getTutors({ status: filterStatus.value })
    tutors.value = res.data
  } catch (error) {
    console.error('加载家教信息失败:', error)
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

const updateStatus = async (tutor, status) => {
  try {
    await adminApi.updateTutorStatus(tutor.id, { status })
    tutor.status = status
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新状态失败:', error)
  }
}

const deleteTutor = async (tutor) => {
  try {
    await ElMessageBox.confirm('确定要删除该家教信息吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteTutor(tutor.id)
    ElMessage.success('删除成功')
    loadTutors()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

onMounted(() => {
  loadTutors()
})
</script>

<style scoped>
.tutors-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-input v-model="keyword" placeholder="搜索用户" prefix-icon="Search" style="width: 200px" @input="loadUsers" />
        </div>
      </template>
      <el-table :data="users" stripe>
        <el-table-column prop="studentId" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="major" label="专业" width="150" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button 
              :type="row.status === 'active' ? 'danger' : 'success'" 
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
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

const users = ref([])
const keyword = ref('')

const loadUsers = async () => {
  try {
    const res = await adminApi.getUsers({ keyword: keyword.value })
    users.value = res.data
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

const toggleStatus = async (user) => {
  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  try {
    await adminApi.updateUserStatus(user.id, { status: newStatus })
    user.status = newStatus
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新用户状态失败:', error)
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

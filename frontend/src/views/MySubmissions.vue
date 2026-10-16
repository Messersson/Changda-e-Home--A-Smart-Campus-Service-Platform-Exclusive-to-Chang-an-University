<template>
  <div class="my-submissions-page">
    <div class="page-header">
      <div>
        <h2>我的发布</h2>
        <p>查看家教、二手、资料、帖子和驾校咨询的审核状态与回复。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="家教" name="tutors">
          <el-table :data="tutors" stripe>
            <el-table-column prop="subject" label="科目" width="120" />
            <el-table-column prop="grade" label="年级" width="90" />
            <el-table-column prop="salary" label="薪资" width="100">
              <template #default="{ row }">¥{{ row.salary }}/小时</template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="二手商品" name="secondhand">
          <el-table :data="secondhand" stripe>
            <el-table-column prop="title" label="商品标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="category" label="分类" width="110" />
            <el-table-column label="价格" width="100">
              <template #default="{ row }">¥{{ Number(row.price ?? 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="学习资料" name="materials">
          <el-table :data="materials" stripe>
            <el-table-column prop="title" label="资料标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="subject" label="学科" width="110" />
            <el-table-column prop="fileName" label="文件名" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button v-if="row.fileName" size="small" @click="downloadMaterial(row)">下载</el-button>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="论坛帖子" name="forum">
          <el-table :data="posts" stripe>
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="likes" label="点赞" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="驾校咨询" name="inquiries">
          <el-table :data="inquiries" stripe>
            <el-table-column prop="schoolName" label="驾校" width="140" />
            <el-table-column prop="question" label="咨询内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="reply" label="回复内容" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reply || '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { onActivated, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { drivingSchoolApi, forumApi, secondhandApi, studyMaterialApi, tutorApi } from '@/api'

const activeTab = ref('tutors')
const loading = ref(false)
const tutors = ref([])
const secondhand = ref([])
const materials = ref([])
const posts = ref([])
const inquiries = ref([])

const loadAll = async () => {
  loading.value = true
  const results = await Promise.allSettled([
    tutorApi.getMyTutors(),
    secondhandApi.getMyItems(),
    studyMaterialApi.getMyMaterials(),
    forumApi.getMyPosts(),
    drivingSchoolApi.getMyInquiries()
  ])
  const values = results.map((result) => result.status === 'fulfilled' ? (result.value?.data || []) : [])
  tutors.value = values[0]
  secondhand.value = values[1]
  materials.value = values[2]
  posts.value = values[3]
  inquiries.value = values[4]
  loading.value = false
}

const statusText = (status) => {
  const labels = {
    pending: '待审核',
    active: '已通过',
    rejected: '已拒绝',
    sold: '已售出',
    cancelled: '已取消',
    replied: '已回复'
  }
  return labels[status] || status || '-'
}

const statusType = (status) => {
  if (status === 'active' || status === 'replied') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN')
}

const downloadMaterial = async (material) => {
  try {
    const blob = await studyMaterialApi.downloadFile(material.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = material.fileName || `material-${material.id}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

onActivated(loadAll)
</script>

<style scoped>
.my-submissions-page {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #667085;
}
</style>

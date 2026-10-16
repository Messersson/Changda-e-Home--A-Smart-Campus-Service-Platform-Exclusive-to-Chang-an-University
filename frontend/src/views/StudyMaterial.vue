<template>
  <div class="study-material-page">
    <div class="page-header">
      <h2>学习资料</h2>
      <el-button v-if="!isGuest" type="primary" @click="uploadDialogVisible = true">上传资料</el-button>
      <el-tag v-else type="info">游客仅可浏览和查找</el-tag>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="专业">
          <el-input v-model="filterForm.major" placeholder="请输入专业" clearable />
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="filterForm.grade" placeholder="请选择年级" clearable>
            <el-option label="大一" value="大一" />
            <el-option label="大二" value="大二" />
            <el-option label="大三" value="大三" />
            <el-option label="大四" value="大四" />
            <el-option label="研一" value="研一" />
            <el-option label="研二" value="研二" />
            <el-option label="研三" value="研三" />
          </el-select>
        </el-form-item>
        <el-form-item label="学科">
          <el-input v-model="filterForm.subject" placeholder="请输入学科" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadMaterials">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="materials" stripe class="material-table">
      <el-table-column prop="title" label="资料名称" min-width="200" />
      <el-table-column prop="major" label="专业" width="150" />
      <el-table-column prop="grade" label="年级" width="100" />
      <el-table-column prop="subject" label="学科" width="120" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small">{{ row.type.toUpperCase() }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="大小" width="100" />
      <el-table-column prop="fileName" label="文件名" min-width="160" show-overflow-tooltip />
      <el-table-column prop="downloadCount" label="下载次数" width="100" sortable />
      <el-table-column prop="uploaderName" label="上传者" width="100" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button v-if="!isGuest" type="primary" size="small" @click="downloadMaterial(row)">下载</el-button>
          <el-button size="small" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="materials.length === 0" description="暂无学习资料" />

    <el-drawer v-model="detailDrawerVisible" title="资料详情" size="400px">
      <div v-if="selectedMaterial" class="material-detail">
        <h2>{{ selectedMaterial.title }}</h2>
        <div class="detail-meta">
          <el-tag>{{ selectedMaterial.major }}</el-tag>
          <el-tag>{{ selectedMaterial.grade }}</el-tag>
          <el-tag>{{ selectedMaterial.subject }}</el-tag>
        </div>
        <el-divider />
        <div class="detail-info">
          <p><strong>类型：</strong>{{ selectedMaterial.type.toUpperCase() }}</p>
          <p><strong>大小：</strong>{{ selectedMaterial.size }}</p>
          <p v-if="selectedMaterial.fileName"><strong>文件：</strong>{{ selectedMaterial.fileName }}</p>
          <p><strong>下载次数：</strong>{{ selectedMaterial.downloadCount }}</p>
          <p><strong>上传者：</strong>{{ selectedMaterial.uploaderName }}</p>
          <p><strong>描述：</strong>{{ selectedMaterial.description }}</p>
        </div>
        <el-button v-if="!isGuest" type="primary" style="width: 100%; margin-top: 20px" @click="downloadMaterial(selectedMaterial)">
          下载资料
        </el-button>
      </div>
    </el-drawer>

    <el-dialog v-model="uploadDialogVisible" title="上传学习资料" width="600px">
      <el-form :model="uploadForm" :rules="uploadRules" ref="uploadFormRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="uploadForm.title" placeholder="请输入资料标题" />
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="uploadForm.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-select v-model="uploadForm.grade" placeholder="请选择年级">
            <el-option label="大一" value="大一" />
            <el-option label="大二" value="大二" />
            <el-option label="大三" value="大三" />
            <el-option label="大四" value="大四" />
            <el-option label="研一" value="研一" />
            <el-option label="研二" value="研二" />
            <el-option label="研三" value="研三" />
          </el-select>
        </el-form-item>
        <el-form-item label="学科" prop="subject">
          <el-input v-model="uploadForm.subject" placeholder="请输入学科" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="uploadForm.type" placeholder="请选择类型">
            <el-option label="PDF" value="pdf" />
            <el-option label="Word" value="doc" />
            <el-option label="Excel" value="xls" />
            <el-option label="PPT" value="ppt" />
            <el-option label="图片" value="img" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" prop="file">
          <el-upload
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或点击选择文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="uploadForm.description" type="textarea" :rows="4" placeholder="请输入资料描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUpload" :loading="uploading">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { studyMaterialApi } from '@/api'
import { useUserStore } from '@/stores/user'

const materials = ref([])
const filterForm = ref({
  major: '',
  grade: '',
  subject: ''
})
const detailDrawerVisible = ref(false)
const selectedMaterial = ref(null)
const uploadDialogVisible = ref(false)
const uploading = ref(false)
const uploadFormRef = ref(null)
const userStore = useUserStore()
const isGuest = computed(() => !userStore.token)
const uploadForm = ref({
  title: '',
  major: '',
  grade: '',
  subject: '',
  type: 'pdf',
  description: '',
  file: null
})
const fileList = ref([])

const uploadRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  major: [{ required: true, message: '请输入专业', trigger: 'blur' }],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  subject: [{ required: true, message: '请输入学科', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  file: [{ required: true, message: '请选择上传文件', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const handleFileChange = (uploadFile) => {
  uploadForm.value.file = uploadFile.raw
  fileList.value = [uploadFile]
  const extension = uploadFile.name.split('.').pop()?.toLowerCase()
  const typeMap = { pdf: 'pdf', doc: 'doc', docx: 'doc', xls: 'xls', xlsx: 'xls', ppt: 'ppt', pptx: 'ppt' }
  uploadForm.value.type = typeMap[extension] || 'other'
}

const handleFileRemove = () => {
  uploadForm.value.file = null
  fileList.value = []
}

const loadMaterials = async () => {
  try {
    const res = await studyMaterialApi.getMaterials(filterForm.value)
    materials.value = res.data
  } catch (error) {
    console.error('加载学习资料失败:', error)
  }
}

const resetFilter = () => {
  filterForm.value = { major: '', grade: '', subject: '' }
  loadMaterials()
}

const showDetail = (material) => {
  selectedMaterial.value = material
  detailDrawerVisible.value = true
}

const downloadMaterial = async (material) => {
  if (isGuest.value) {
    ElMessage.warning('游客只能浏览资料，请登录后下载')
    return
  }
  try {
    const blob = await studyMaterialApi.downloadFile(material.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = material.fileName || `${material.title}.${material.type || 'file'}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
    loadMaterials()
  } catch (error) {
    console.error('下载失败:', error)
  }
}

const submitUpload = async () => {
  if (isGuest.value) {
    ElMessage.warning('游客不能上传资料，请先登录')
    return
  }
  if (!uploadFormRef.value) return
  await uploadFormRef.value.validate(async (valid) => {
    if (valid) {
      uploading.value = true
      try {
        if (!uploadForm.value.file) {
          ElMessage.warning('请选择上传文件')
          return
        }
        const formData = new FormData()
        Object.entries(uploadForm.value).forEach(([key, value]) => {
          if (key !== 'file' && value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        formData.append('file', uploadForm.value.file)
        await studyMaterialApi.uploadMaterialFile(formData)
        ElMessage.success('上传成功，等待审核')
        uploadDialogVisible.value = false
        uploadForm.value = { title: '', major: '', grade: '', subject: '', type: 'pdf', description: '', file: null }
        fileList.value = []
        loadMaterials()
      } catch (error) {
        console.error('上传失败:', error)
      } finally {
        uploading.value = false
      }
    }
  })
}

onMounted(() => {
  loadMaterials()
})
</script>

<style scoped>
.study-material-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.filter-card {
  margin-bottom: 20px;
}

.material-table {
  margin-top: 20px;
}

.material-detail h2 {
  margin: 0 0 15px;
  color: #333;
}

.detail-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
}

.detail-info p {
  margin: 15px 0;
  color: #666;
  line-height: 1.6;
}
</style>

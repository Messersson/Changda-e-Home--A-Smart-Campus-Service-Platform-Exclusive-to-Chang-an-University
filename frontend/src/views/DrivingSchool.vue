<template>
  <div class="driving-school-page">
    <div class="page-header">
      <h2>驾校板块</h2>
    </div>

    <el-row :gutter="20" class="school-list">
      <el-col v-for="school in schools" :key="school.id" :xs="24" :sm="12" :md="8">
        <el-card class="school-card" shadow="hover">
          <div class="school-header">
            <h3>{{ school.name }}</h3>
            <el-tag type="success">营业中</el-tag>
          </div>
          <div class="school-info">
            <p><el-icon><Location /></el-icon> 地址：{{ school.address }}</p>
            <p><el-icon><Phone /></el-icon> 电话：{{ school.phone }}</p>
            <p><el-icon><Money /></el-icon> 价格：¥{{ school.price }}</p>
          </div>
          <div class="school-features">
            <el-tag v-for="feature in school.features" :key="feature" size="small">
              {{ feature }}
            </el-tag>
          </div>
          <p class="school-description">{{ school.description }}</p>
          <div class="school-actions">
            <el-button type="primary" @click="showDetail(school)">查看详情</el-button>
            <el-button @click="showInquiryDialog(school)">咨询</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-drawer v-model="detailDrawerVisible" title="驾校详情" size="500px">
      <div v-if="selectedSchool" class="school-detail">
        <h2>{{ selectedSchool.name }}</h2>
        <div class="detail-info">
          <p><el-icon><Location /></el-icon> 地址：{{ selectedSchool.address }}</p>
          <p><el-icon><Phone /></el-icon> 电话：{{ selectedSchool.phone }}</p>
          <p><el-icon><Money /></el-icon> 价格：¥{{ selectedSchool.price }}</p>
        </div>
        <el-divider />
        <div class="detail-features">
          <h4>特色服务</h4>
          <div class="features">
            <el-tag v-for="feature in selectedSchool.features" :key="feature" type="success">
              {{ feature }}
            </el-tag>
          </div>
        </div>
        <div class="detail-description">
          <h4>驾校介绍</h4>
          <p>{{ selectedSchool.description }}</p>
        </div>
        <el-button type="primary" style="width: 100%; margin-top: 20px" @click="showInquiryDialog(selectedSchool)">
          立即咨询
        </el-button>
      </div>
    </el-drawer>

    <el-dialog v-model="inquiryDialogVisible" title="驾校咨询" width="500px">
      <el-form :model="inquiryForm" :rules="inquiryRules" ref="inquiryFormRef" label-width="80px">
        <el-form-item label="驾校">
          <el-input :model-value="selectedSchool?.name || ''" disabled />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="inquiryForm.name" placeholder="请输入您的姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="inquiryForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="咨询问题" prop="question">
          <el-input v-model="inquiryForm.question" type="textarea" :rows="4" placeholder="请输入您想咨询的问题" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inquiryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitInquiry" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, Phone, Money } from '@element-plus/icons-vue'
import { drivingSchoolApi } from '@/api'

const schools = ref([])
const detailDrawerVisible = ref(false)
const inquiryDialogVisible = ref(false)
const selectedSchool = ref(null)
const submitting = ref(false)
const inquiryFormRef = ref(null)
const inquiryForm = ref({
  name: '',
  phone: '',
  question: ''
})

const inquiryRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  question: [{ required: true, message: '请输入咨询问题', trigger: 'blur' }]
}

const loadSchools = async () => {
  try {
    const res = await drivingSchoolApi.getSchools()
    schools.value = res.data
  } catch (error) {
    console.error('加载驾校列表失败:', error)
  }
}

const showDetail = (school) => {
  selectedSchool.value = school
  detailDrawerVisible.value = true
}

const showInquiryDialog = (school) => {
  selectedSchool.value = school
  inquiryDialogVisible.value = true
}

const submitInquiry = async () => {
  if (!inquiryFormRef.value) return
  await inquiryFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        await drivingSchoolApi.submitInquiry({
          schoolId: selectedSchool.value.id,
          ...inquiryForm.value
        })
        ElMessage.success('咨询提交成功')
        inquiryDialogVisible.value = false
        inquiryForm.value = { name: '', phone: '', question: '' }
      } catch (error) {
        console.error('提交咨询失败:', error)
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadSchools()
})
</script>

<style scoped>
.driving-school-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #333;
}

.school-list {
  margin-top: 20px;
}

.school-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.school-card:hover {
  transform: translateY(-5px);
}

.school-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.school-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.school-info {
  margin-bottom: 15px;
}

.school-info p {
  margin: 10px 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.school-features {
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.school-description {
  color: #999;
  font-size: 14px;
  margin-bottom: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.school-actions {
  display: flex;
  gap: 10px;
}

.school-actions .el-button {
  flex: 1;
}

.school-detail h2 {
  margin: 0 0 20px;
  color: #333;
}

.detail-info p {
  margin: 15px 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.detail-features h4,
.detail-description h4 {
  margin: 20px 0 10px;
  color: #333;
}

.detail-features .features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-description p {
  color: #666;
  line-height: 1.8;
}
</style>

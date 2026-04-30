<template>
  <div class="tutor-page">
    <div class="page-header">
      <h2>家教板块</h2>
      <el-button type="primary" @click="publishDialogVisible = true">发布家教信息</el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="科目">
          <el-input v-model="filterForm.subject" placeholder="请输入科目" clearable />
        </el-form-item>
        <el-form-item label="年级">
          <el-select v-model="filterForm.grade" placeholder="请选择年级" clearable>
            <el-option label="小学" value="小学" />
            <el-option label="初中" value="初中" />
            <el-option label="高中" value="高中" />
            <el-option label="大一" value="大一" />
            <el-option label="大二" value="大二" />
            <el-option label="大三" value="大三" />
            <el-option label="大四" value="大四" />
          </el-select>
        </el-form-item>
        <el-form-item label="薪资范围">
          <el-input-number v-model="filterForm.minSalary" :min="0" placeholder="最低" />
          <span style="margin: 0 10px">-</span>
          <el-input-number v-model="filterForm.maxSalary" :min="0" placeholder="最高" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadTutors">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20" class="tutor-list">
      <el-col v-for="tutor in tutors" :key="tutor.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="tutor-card" shadow="hover">
          <div class="tutor-header">
            <el-avatar :size="60" :icon="UserFilled" />
            <div class="tutor-name">
              <h3>{{ tutor.name }}</h3>
              <el-tag size="small">{{ tutor.grade }}</el-tag>
            </div>
          </div>
          <div class="tutor-info">
            <p><el-icon><Reading /></el-icon> 科目：{{ tutor.subject }}</p>
            <p><el-icon><Money /></el-icon> 薪资：¥{{ tutor.salary }}/小时</p>
            <p><el-icon><Phone /></el-icon> 联系方式：{{ tutor.contact }}</p>
          </div>
          <p class="tutor-description">{{ tutor.description }}</p>
          <div class="tutor-actions">
            <el-button @click="showDetail(tutor)">查看详情</el-button>
            <el-button type="primary" @click="showOrderDialog(tutor)">预约下单</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="tutors.length === 0" description="暂无家教信息" />

    <el-drawer v-model="detailDrawerVisible" title="家教详情" size="420px">
      <div v-if="selectedTutor" class="tutor-detail">
        <div class="detail-header">
          <el-avatar :size="80" :icon="UserFilled" />
          <div>
            <h2>{{ selectedTutor.name }}</h2>
            <el-tag>{{ selectedTutor.grade }}</el-tag>
          </div>
        </div>
        <el-divider />
        <div class="detail-info">
          <p><strong>科目：</strong>{{ selectedTutor.subject }}</p>
          <p><strong>薪资：</strong>¥{{ selectedTutor.salary }}/小时</p>
          <p><strong>联系方式：</strong>{{ selectedTutor.contact }}</p>
          <p><strong>描述：</strong>{{ selectedTutor.description }}</p>
        </div>
        <el-button type="primary" style="width: 100%; margin-top: 20px" @click="showOrderDialog(selectedTutor)">
          立即预约
        </el-button>
      </div>
    </el-drawer>

    <el-dialog v-model="orderDialogVisible" title="家教下单" width="520px">
      <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-width="90px">
        <el-form-item label="家教老师">
          <el-input :model-value="selectedTutor ? `${selectedTutor.name} · ${selectedTutor.subject}` : ''" disabled />
        </el-form-item>
        <el-form-item label="预约课时" prop="hours">
          <el-input-number v-model="orderForm.hours" :min="1" :max="50" />
          <span class="field-suffix">小时</span>
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="orderForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="上课地点" prop="address">
          <el-input v-model="orderForm.address" placeholder="请输入上课地点" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="orderForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可填写希望的上课时间、补充要求等"
          />
        </el-form-item>
      </el-form>

      <div class="order-preview">
        <span>预计金额</span>
        <strong>¥{{ tutorOrderAmount.toFixed(2) }}</strong>
      </div>

      <template #footer>
        <el-button @click="orderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingOrder" @click="submitOrder">确认下单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="publishDialogVisible" title="发布家教信息" width="500px">
      <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="80px">
        <el-form-item label="科目" prop="subject">
          <el-input v-model="publishForm.subject" placeholder="请输入科目" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-select v-model="publishForm.grade" placeholder="请选择年级">
            <el-option label="小学" value="小学" />
            <el-option label="初中" value="初中" />
            <el-option label="高中" value="高中" />
            <el-option label="大一" value="大一" />
            <el-option label="大二" value="大二" />
            <el-option label="大三" value="大三" />
            <el-option label="大四" value="大四" />
          </el-select>
        </el-form-item>
        <el-form-item label="薪资" prop="salary">
          <el-input-number v-model="publishForm.salary" :min="1" :max="500" />
          <span style="margin-left: 10px">元/小时</span>
        </el-form-item>
        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="publishForm.contact" placeholder="请输入联系方式" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="publishForm.description" type="textarea" :rows="4" placeholder="请输入描述信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="submitPublish">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, Reading, Money, Phone } from '@element-plus/icons-vue'
import { tutorApi } from '@/api'
import { useRouter } from 'vue-router'
import { startPaymentByOrderId } from '@/utils/paymentFlow'

const tutors = ref([])
const filterForm = ref({
  subject: '',
  grade: '',
  minSalary: null,
  maxSalary: null
})
const detailDrawerVisible = ref(false)
const selectedTutor = ref(null)
const router = useRouter()
const publishDialogVisible = ref(false)
const publishing = ref(false)
const publishFormRef = ref(null)
const publishForm = ref({
  subject: '',
  grade: '',
  salary: 50,
  contact: '',
  description: ''
})

const orderDialogVisible = ref(false)
const submittingOrder = ref(false)
const orderFormRef = ref(null)
const orderForm = ref({
  tutorId: null,
  hours: 2,
  phone: '',
  address: '',
  remark: ''
})

const publishRules = {
  subject: [{ required: true, message: '请输入科目', trigger: 'blur' }],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  salary: [{ required: true, message: '请输入薪资', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系方式', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const orderRules = {
  hours: [{ required: true, message: '请输入预约课时', trigger: 'change' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入上课地点', trigger: 'blur' }]
}

const tutorOrderAmount = computed(() => Number(selectedTutor.value?.salary || 0) * Number(orderForm.value.hours || 0))

const resetOrderForm = () => {
  orderForm.value = {
    tutorId: selectedTutor.value?.id || null,
    hours: 2,
    phone: '',
    address: '',
    remark: ''
  }
}

const loadTutors = async () => {
  try {
    const res = await tutorApi.getTutors(filterForm.value)
    tutors.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('加载家教信息失败:', error)
  }
}

const resetFilter = () => {
  filterForm.value = {
    subject: '',
    grade: '',
    minSalary: null,
    maxSalary: null
  }
  loadTutors()
}

const showDetail = (tutor) => {
  selectedTutor.value = tutor
  detailDrawerVisible.value = true
}

const showOrderDialog = (tutor) => {
  selectedTutor.value = tutor
  resetOrderForm()
  orderDialogVisible.value = true
}

const submitOrder = async () => {
  if (!orderFormRef.value || !selectedTutor.value) return

  await orderFormRef.value.validate(async (valid) => {
    if (!valid) return

    submittingOrder.value = true
    try {
      const orderResult = await tutorApi.createOrder(orderForm.value)
      const orderId = orderResult?.data?.orderId
      if (!orderId) {
        ElMessage.error('下单成功但未获取到订单号，请前往我的订单支付')
        return
      }

      ElMessage.success('下单成功，正在进入支付页')
      orderDialogVisible.value = false
      resetOrderForm()
      await startPaymentByOrderId(orderId, router)
    } catch (error) {
      console.error('家教下单失败:', error)
    } finally {
      submittingOrder.value = false
    }
  })
}

const submitPublish = async () => {
  if (!publishFormRef.value) return

  await publishFormRef.value.validate(async (valid) => {
    if (!valid) return

    publishing.value = true
    try {
      await tutorApi.publishTutor(publishForm.value)
      ElMessage.success('发布成功，等待审核')
      publishDialogVisible.value = false
      publishForm.value = { subject: '', grade: '', salary: 50, contact: '', description: '' }
      loadTutors()
    } catch (error) {
      console.error('发布失败:', error)
    } finally {
      publishing.value = false
    }
  })
}

onMounted(() => {
  loadTutors()
})
</script>

<style scoped>
.tutor-page {
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

.tutor-list {
  margin-top: 20px;
}

.tutor-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.tutor-card:hover {
  transform: translateY(-5px);
}

.tutor-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.tutor-name h3 {
  margin: 0 0 5px;
  color: #333;
}

.tutor-info {
  margin-bottom: 15px;
}

.tutor-info p {
  margin: 8px 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.tutor-description {
  color: #999;
  font-size: 14px;
  margin-bottom: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tutor-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tutor-detail .detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.tutor-detail .detail-header h2 {
  margin: 0 0 5px;
  color: #333;
}

.detail-info p {
  margin: 15px 0;
  color: #666;
  line-height: 1.6;
}

.field-suffix {
  margin-left: 10px;
  color: #666;
}

.order-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f6f8ff;
}

.order-preview span {
  color: #666;
}

.order-preview strong {
  color: #3366ff;
  font-size: 24px;
}
</style>

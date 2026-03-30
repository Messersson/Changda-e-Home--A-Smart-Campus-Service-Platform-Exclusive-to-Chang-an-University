<template>
  <div class="driving-schools-page">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="驾校列表" name="schools">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>驾校管理</span>
              <el-button type="primary" @click="showAddDialog">添加驾校</el-button>
            </div>
          </template>
          <el-table :data="schools" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="驾校名称" min-width="120" />
            <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="price" label="价格(元)" width="100">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column label="特色" width="150">
              <template #default="{ row }">
                <span v-if="row.features && row.features.length">{{ row.features.join('、') }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                  {{ row.status === 'active' ? '展示' : '下架' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteSchool(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="咨询记录" name="inquiries">
        <el-card>
          <template #header>
            <span>驾校咨询记录</span>
          </template>
          <el-table :data="inquiries" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="schoolName" label="驾校" width="120" />
            <el-table-column prop="name" label="咨询人" width="100" />
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="question" label="咨询内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'replied' ? 'success' : 'warning'">
                  {{ row.status === 'replied' ? '已回复' : '待回复' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="提交时间" width="165">
              <template #default="{ row }">
                {{ row.createdAt ? new Date(row.createdAt).toLocaleString() : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'pending'"
                  size="small"
                  type="primary"
                  @click="markReplied(row)"
                >
                  标记已回复
                </el-button>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑驾校' : '添加驾校'" width="560px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="驾校名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入驾校名称" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="价格(元)" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="驾校介绍" />
        </el-form-item>
        <el-form-item label="特色">
          <el-select v-model="form.features" multiple filterable allow-create placeholder="如：包过班、周末练车" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="active">展示</el-radio>
            <el-radio label="inactive">下架</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'

const activeTab = ref('schools')
const schools = ref([])
const inquiries = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = ref({
  name: '',
  address: '',
  phone: '',
  price: 0,
  description: '',
  features: [],
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入驾校名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }]
}

const loadSchools = async () => {
  try {
    const res = await adminApi.getDrivingSchools()
    schools.value = res.data
  } catch (error) {
    console.error('加载驾校列表失败:', error)
  }
}

const loadInquiries = async () => {
  try {
    const res = await adminApi.getDrivingInquiries()
    inquiries.value = res.data
  } catch (error) {
    console.error('加载咨询记录失败:', error)
  }
}

watch(activeTab, (tab) => {
  if (tab === 'schools') loadSchools()
  else if (tab === 'inquiries') loadInquiries()
})

const showAddDialog = () => {
  isEdit.value = false
  form.value = { name: '', address: '', phone: '', price: 0, description: '', features: [], status: 'active' }
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    price: row.price,
    description: row.description || '',
    features: Array.isArray(row.features) ? [...row.features] : (row.features ? JSON.parse(row.features || '[]') : []),
    status: row.status
  }
  dialogVisible.value = true
}

const submit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const data = {
        name: form.value.name,
        address: form.value.address,
        phone: form.value.phone,
        price: form.value.price,
        description: form.value.description,
        features: form.value.features
      }
      if (isEdit.value) {
        data.status = form.value.status
        await adminApi.updateDrivingSchool(form.value.id, data)
        ElMessage.success('更新成功')
      } else {
        await adminApi.addDrivingSchool(data)
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
      loadSchools()
    } catch (error) {
      console.error('操作失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

const deleteSchool = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该驾校吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteDrivingSchool(row.id)
    ElMessage.success('删除成功')
    loadSchools()
  } catch (error) {
    if (error !== 'cancel') console.error('删除失败:', error)
  }
}

const markReplied = async (row) => {
  try {
    await adminApi.updateDrivingInquiryStatus(row.id, { status: 'replied' })
    ElMessage.success('已标记为已回复')
    loadInquiries()
  } catch (error) {
    console.error('更新失败:', error)
  }
}

onMounted(() => {
  loadSchools()
})
</script>

<style scoped>
.driving-schools-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-muted {
  color: #999;
}
</style>

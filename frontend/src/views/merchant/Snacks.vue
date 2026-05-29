<template>
  <div class="merchant-goods-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>小吃商品</span>
          <el-button type="primary" @click="openCreate">新增商品</el-button>
        </div>
      </template>

      <el-table :data="snacks" stripe v-loading="loading">
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">￥{{ Number(row.price || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '上架' : '下架' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '新增商品'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="图片">
          <ImageDropInput v-model="form.image" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="上架" inactive-text="下架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { merchantApi } from '@/api'
import ImageDropInput from '@/components/ImageDropInput.vue'

const snacks = ref([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = ref({ name: '', price: 0, description: '', image: '', active: true })

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const loadSnacks = async () => {
  loading.value = true
  try {
    const result = await merchantApi.getSnacks()
    snacks.value = Array.isArray(result.data) ? result.data : []
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  isEdit.value = false
  form.value = { name: '', price: 0, description: '', image: '', active: true }
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  form.value = { ...row, active: row.status === 'active' }
  dialogVisible.value = true
}

const submit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const payload = { ...form.value, status: form.value.active ? 'active' : 'inactive' }
      if (isEdit.value) {
        await merchantApi.updateSnack(form.value.id, payload)
      } else {
        await merchantApi.addSnack(payload)
      }
      ElMessage.success('保存成功')
      dialogVisible.value = false
      loadSnacks()
    } finally {
      submitting.value = false
    }
  })
}

const remove = async (row) => {
  await ElMessageBox.confirm('确定删除该商品吗？', '提示', { type: 'warning' })
  await merchantApi.deleteSnack(row.id)
  ElMessage.success('删除成功')
  loadSnacks()
}

onMounted(loadSnacks)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

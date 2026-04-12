<template>
  <div class="snacks-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>小吃摊管理</span>
          <el-button type="primary" @click="showAddDialog">添加菜品</el-button>
        </div>
      </template>
      <el-table :data="snacks" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="菜品名称" width="120" />
        <el-table-column prop="price" label="价格" width="80">
          <template #default="{ row }">¥{{ Number(row.price ?? 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="merchant" label="商家" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSnack(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑菜品' : '添加菜品'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="菜品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入菜品名称" />
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
          <span style="margin-left: 10px">元</span>
        </el-form-item>
        <el-form-item label="商家" prop="merchant">
          <el-input v-model="form.merchant" placeholder="请输入商家名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入菜品描述" />
        </el-form-item>
        <el-form-item label="图片">
          <el-input v-model="form.image" placeholder="请输入图片URL" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-text="上架" inactive-text="下架" />
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'

const snacks = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const form = ref({
  name: '',
  price: 0,
  merchant: '',
  description: '',
  image: '',
  status: true
})

const rules = {
  name: [{ required: true, message: '请输入菜品名称', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  merchant: [{ required: true, message: '请输入商家名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const loadSnacks = async () => {
  try {
    const res = await adminApi.getSnacks()
    snacks.value = (Array.isArray(res.data) ? res.data : []).map(item => ({
      ...item,
      price: Number(item.price ?? 0)
    }))
  } catch (error) {
    console.error('加载菜品列表失败:', error)
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = { name: '', price: 0, merchant: '', description: '', image: '', status: true }
  dialogVisible.value = true
}

const showEditDialog = (snack) => {
  isEdit.value = true
  form.value = {
    ...snack,
    price: Number(snack.price ?? 0),
    status: snack.status === 'active'
  }
  dialogVisible.value = true
}

const submit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const data = {
          ...form.value,
          status: form.value.status ? 'active' : 'inactive'
        }
        if (isEdit.value) {
          await adminApi.updateSnack(form.value.id, data)
          ElMessage.success('更新成功')
        } else {
          await adminApi.addSnack(data)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        loadSnacks()
      } catch (error) {
        console.error('操作失败:', error)
      } finally {
        submitting.value = false
      }
    }
  })
}

const deleteSnack = async (snack) => {
  try {
    await ElMessageBox.confirm('确定要删除该菜品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteSnack(snack.id)
    ElMessage.success('删除成功')
    loadSnacks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

onMounted(() => {
  loadSnacks()
})
</script>

<style scoped>
.snacks-page {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

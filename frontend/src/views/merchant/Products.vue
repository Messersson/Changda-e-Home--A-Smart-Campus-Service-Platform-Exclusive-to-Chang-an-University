<template>
  <div class="merchant-products-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>超市商品</span>
          <el-button type="primary" @click="openCreate">新增商品</el-button>
        </div>
      </template>

      <el-table :data="products" stripe v-loading="loading">
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column label="分类" width="130">
          <template #default="{ row }">{{ categoryName(row.categoryId) }}</template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">￥{{ Number(row.price || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="stock" label="库存" width="90" />
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑商品' : '新增商品'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="form.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="form.spec" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
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

const products = ref([])
const categories = ref([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = ref({ name: '', categoryId: null, price: 0, spec: '', stock: 0, description: '', image: '', active: true })

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  spec: [{ required: true, message: '请输入规格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
}

const normalizeProduct = (item) => ({
  ...item,
  categoryId: item.categoryId == null ? null : Number(item.categoryId),
  price: Number(item.price || 0),
  stock: Number(item.stock || 0)
})

const loadData = async () => {
  loading.value = true
  try {
    const [categoryResult, productResult] = await Promise.all([
      merchantApi.getCategories(),
      merchantApi.getProducts()
    ])
    categories.value = Array.isArray(categoryResult.data) ? categoryResult.data : []
    products.value = Array.isArray(productResult.data) ? productResult.data.map(normalizeProduct) : []
  } finally {
    loading.value = false
  }
}

const categoryName = (id) => categories.value.find((item) => Number(item.id) === Number(id))?.name || '-'

const openCreate = () => {
  isEdit.value = false
  form.value = { name: '', categoryId: null, price: 0, spec: '', stock: 0, description: '', image: '', active: true }
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
        await merchantApi.updateProduct(form.value.id, payload)
      } else {
        await merchantApi.addProduct(payload)
      }
      ElMessage.success('保存成功')
      dialogVisible.value = false
      loadData()
    } finally {
      submitting.value = false
    }
  })
}

const remove = async (row) => {
  await ElMessageBox.confirm('确定删除该商品吗？', '提示', { type: 'warning' })
  await merchantApi.deleteProduct(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

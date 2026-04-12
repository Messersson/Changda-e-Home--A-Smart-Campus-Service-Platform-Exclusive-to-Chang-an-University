<template>
  <div class="supermarket-page">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="category-card">
          <template #header>
            <div class="card-header">
              <span>商品分类</span>
              <el-button type="primary" size="small" @click="showCategoryDialog">添加分类</el-button>
            </div>
          </template>
          <el-menu :default-active="selectedCategory" @select="handleCategorySelect" class="category-menu">
            <el-menu-item index="">
              <el-icon><Grid /></el-icon>
              <span>全部商品</span>
            </el-menu-item>
            <template v-for="category in topCategories" :key="category.id">
              <el-menu-item :index="String(category.id)">
                <span>{{ category.icon }} {{ category.name }}</span>
              </el-menu-item>
              <el-menu-item 
                v-for="subCategory in subCategories(category.id)" 
                :key="subCategory.id" 
                :index="String(subCategory.id)"
                class="sub-category"
              >
                <span>{{ subCategory.icon }} {{ subCategory.name }}</span>
              </el-menu-item>
            </template>
          </el-menu>
        </el-card>
      </el-col>
      <el-col :span="18">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>商品管理</span>
              <el-button type="primary" @click="showProductDialog">添加商品</el-button>
            </div>
          </template>
          <el-table :data="products" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="商品名称" width="150" />
            <el-table-column label="分类" width="120">
              <template #default="{ row }">
                {{ getCategoryName(row.categoryId) }}
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" width="80">
              <template #default="{ row }">¥{{ Number(row.price ?? 0).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="spec" label="规格" width="100" />
            <el-table-column prop="stock" label="库存" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                  {{ row.status === 'active' ? '上架' : '下架' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="showProductEditDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteProduct(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="categoryDialogVisible" title="添加分类" width="500px">
      <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="80px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="categoryForm.icon" placeholder="请输入图标emoji" />
        </el-form-item>
        <el-form-item label="父分类">
          <el-select v-model="categoryForm.parentId" placeholder="请选择父分类" clearable>
            <el-option v-for="cat in topCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCategory" :loading="categorySubmitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="productDialogVisible" :title="isProductEdit ? '编辑商品' : '添加商品'" width="600px">
      <el-form :model="productForm" :rules="productRules" ref="productFormRef" label-width="80px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="productForm.name" placeholder="请输入商品名称" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="productForm.categoryId" placeholder="请选择分类">
            <el-option v-for="cat in allCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="productForm.price" :min="0" :precision="2" />
          <span style="margin-left: 10px">元</span>
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="productForm.spec" placeholder="请输入规格，如：70g" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="productForm.stock" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="productForm.description" type="textarea" :rows="3" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="图片">
          <el-input v-model="productForm.image" placeholder="请输入图片URL" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="productForm.status" active-text="上架" inactive-text="下架" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProduct" :loading="productSubmitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Grid } from '@element-plus/icons-vue'
import { adminApi } from '@/api'

const categories = ref([])
const products = ref([])
const selectedCategory = ref('')
const categoryDialogVisible = ref(false)
const productDialogVisible = ref(false)
const isProductEdit = ref(false)
const categorySubmitting = ref(false)
const productSubmitting = ref(false)
const categoryFormRef = ref(null)
const productFormRef = ref(null)
const categoryForm = ref({
  name: '',
  icon: '',
  parentId: null
})
const productForm = ref({
  name: '',
  categoryId: null,
  price: 0,
  spec: '',
  stock: 0,
  description: '',
  image: '',
  status: true
})

const topCategories = computed(() => {
  return categories.value.filter(c => !c.parentId)
})

const subCategories = computed(() => {
  return (parentId) => {
    return categories.value.filter(c => c.parentId === parentId)
  }
})

const allCategories = computed(() => {
  return categories.value
})

const categoryRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  icon: [{ required: true, message: '请输入图标', trigger: 'blur' }]
}

const productRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  spec: [{ required: true, message: '请输入规格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }]
}

const loadCategories = async () => {
  try {
    const res = await adminApi.getSupermarketCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const loadProducts = async () => {
  try {
    const res = await adminApi.getSupermarketProducts({ categoryId: selectedCategory.value })
    products.value = (Array.isArray(res.data) ? res.data : []).map(item => ({
      ...item,
      categoryId: item.categoryId == null ? null : Number(item.categoryId),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 0)
    }))
  } catch (error) {
    console.error('加载商品列表失败:', error)
  }
}

const handleCategorySelect = (index) => {
  selectedCategory.value = index
  loadProducts()
}

const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category ? category.name : ''
}

const showCategoryDialog = () => {
  categoryForm.value = { name: '', icon: '', parentId: null }
  categoryDialogVisible.value = true
}

const submitCategory = async () => {
  if (!categoryFormRef.value) return
  await categoryFormRef.value.validate(async (valid) => {
    if (valid) {
      categorySubmitting.value = true
      try {
        await adminApi.addSupermarketCategory(categoryForm.value)
        ElMessage.success('添加成功')
        categoryDialogVisible.value = false
        loadCategories()
      } catch (error) {
        console.error('添加分类失败:', error)
      } finally {
        categorySubmitting.value = false
      }
    }
  })
}

const showProductDialog = () => {
  isProductEdit.value = false
  productForm.value = { name: '', categoryId: null, price: 0, spec: '', stock: 0, description: '', image: '', status: true }
  productDialogVisible.value = true
}

const showProductEditDialog = (product) => {
  isProductEdit.value = true
  productForm.value = {
    ...product,
    categoryId: product.categoryId == null ? null : Number(product.categoryId),
    price: Number(product.price ?? 0),
    stock: Number(product.stock ?? 0),
    status: product.status === 'active'
  }
  productDialogVisible.value = true
}

const submitProduct = async () => {
  if (!productFormRef.value) return
  await productFormRef.value.validate(async (valid) => {
    if (valid) {
      productSubmitting.value = true
      try {
        const data = {
          ...productForm.value,
          status: productForm.value.status ? 'active' : 'inactive'
        }
        if (isProductEdit.value) {
          await adminApi.updateSupermarketProduct(productForm.value.id, data)
          ElMessage.success('更新成功')
        } else {
          await adminApi.addSupermarketProduct(data)
          ElMessage.success('添加成功')
        }
        productDialogVisible.value = false
        loadProducts()
      } catch (error) {
        console.error('操作失败:', error)
      } finally {
        productSubmitting.value = false
      }
    }
  })
}

const deleteProduct = async (product) => {
  try {
    await ElMessageBox.confirm('确定要删除该商品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteSupermarketProduct(product.id)
    ElMessage.success('删除成功')
    loadProducts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>

<style scoped>
.supermarket-page {
  padding: 0;
}

.category-card {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-menu {
  border: none;
}

.sub-category {
  padding-left: 40px !important;
}
</style>

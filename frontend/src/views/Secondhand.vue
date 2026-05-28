<template>
  <div class="secondhand-page">
    <div class="page-header">
      <h2>二手交易</h2>
      <el-button type="primary" @click="publishDialogVisible = true">发布商品</el-button>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="请选择分类" clearable>
            <el-option label="电子产品" value="电子产品" />
            <el-option label="书籍资料" value="书籍资料" />
            <el-option label="生活用品" value="生活用品" />
            <el-option label="交通工具" value="交通工具" />
            <el-option label="服装鞋帽" value="服装鞋帽" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="filterForm.keyword" placeholder="请输入关键词" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadItems">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20" class="item-list">
      <el-col v-for="item in items" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="item-card" shadow="hover" @click="showDetail(item)">
          <div class="item-image">
            <el-image :src="item.images[0]" fit="cover" />
          </div>
          <div class="item-info">
            <h3>{{ item.title }}</h3>
            <el-tag size="small">{{ item.category }}</el-tag>
            <div class="item-footer">
              <span class="price">¥{{ Number(item.price).toFixed(2) }}</span>
              <el-button type="danger" :icon="Star" circle @click.stop="toggleFavorite(item)" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-if="items.length === 0" description="暂无商品" />

    <el-drawer v-model="detailDrawerVisible" title="商品详情" size="520px">
      <div v-if="selectedItem" class="item-detail">
        <el-carousel v-if="selectedItem.images.length > 0" :interval="4000" type="card" height="300px">
          <el-carousel-item v-for="(image, index) in selectedItem.images" :key="index">
            <el-image :src="image" fit="cover" style="width: 100%; height: 100%" />
          </el-carousel-item>
        </el-carousel>
        <h2>{{ selectedItem.title }}</h2>
        <div class="detail-meta">
          <el-tag>{{ selectedItem.category }}</el-tag>
          <span class="price">¥{{ Number(selectedItem.price).toFixed(2) }}</span>
        </div>
        <el-divider />
        <div class="detail-content">
          <h4>商品描述</h4>
          <p>{{ selectedItem.description }}</p>
        </div>
        <div class="detail-actions">
          <el-button style="width: 100%" @click="toggleFavorite(selectedItem)">
            {{ isFavorited(selectedItem.id) ? '取消收藏' : '收藏商品' }}
          </el-button>
          <el-button type="primary" style="width: 100%" @click="showOrderDialog(selectedItem)">
            立即下单
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="orderDialogVisible" title="二手商品下单" width="520px">
      <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-width="90px">
        <el-form-item label="商品">
          <el-input :model-value="selectedItem?.title || ''" disabled />
        </el-form-item>
        <el-form-item label="商品价格">
          <el-input :model-value="selectedItem ? `¥${Number(selectedItem.price).toFixed(2)}` : ''" disabled />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="orderForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="交易地点" prop="address">
          <el-input v-model="orderForm.address" placeholder="请输入约定交易地点" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="orderForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可填写交易时间、成色要求等补充信息"
          />
        </el-form-item>
      </el-form>

      <div class="order-preview order-preview--danger">
        <span>订单金额</span>
        <strong>¥{{ secondhandOrderAmount.toFixed(2) }}</strong>
      </div>

      <template #footer>
        <el-button @click="orderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submittingOrder" @click="submitOrder">确认下单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="publishDialogVisible" title="发布二手商品" width="600px">
      <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="publishForm.title" placeholder="请输入商品标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="publishForm.category" placeholder="请选择分类">
            <el-option label="电子产品" value="电子产品" />
            <el-option label="书籍资料" value="书籍资料" />
            <el-option label="生活用品" value="生活用品" />
            <el-option label="交通工具" value="交通工具" />
            <el-option label="服装鞋帽" value="服装鞋帽" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="publishForm.price" :min="0" :precision="2" />
          <span style="margin-left: 10px">元</span>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="publishForm.description" type="textarea" :rows="5" placeholder="请输入商品描述" />
        </el-form-item>
        <el-form-item label="图片">
          <ImageDropInput v-model="publishForm.images" multiple />
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
import { Star } from '@element-plus/icons-vue'
import { secondhandApi } from '@/api'
import { useRouter } from 'vue-router'
import { startPaymentByOrderId } from '@/utils/paymentFlow'
import ImageDropInput from '@/components/ImageDropInput.vue'

const items = ref([])
const favorites = ref([])
const filterForm = ref({
  category: '',
  keyword: ''
})
const detailDrawerVisible = ref(false)
const selectedItem = ref(null)
const router = useRouter()
const publishDialogVisible = ref(false)
const publishing = ref(false)
const publishFormRef = ref(null)
const publishForm = ref({
  title: '',
  category: '',
  price: 0,
  description: '',
  images: []
})

const orderDialogVisible = ref(false)
const submittingOrder = ref(false)
const orderFormRef = ref(null)
const orderForm = ref({
  itemId: null,
  phone: '',
  address: '',
  remark: ''
})

const publishRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const orderRules = {
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入交易地点', trigger: 'blur' }]
}

const secondhandOrderAmount = computed(() => Number(selectedItem.value?.price || 0))

const resetOrderForm = () => {
  orderForm.value = {
    itemId: selectedItem.value?.id || null,
    phone: '',
    address: '',
    remark: ''
  }
}

const loadItems = async () => {
  try {
    const res = await secondhandApi.getItems(filterForm.value)
    items.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('加载商品列表失败:', error)
  }
}

const loadFavorites = async () => {
  try {
    const res = await secondhandApi.getFavorites()
    favorites.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('加载收藏列表失败:', error)
  }
}

const resetFilter = () => {
  filterForm.value = { category: '', keyword: '' }
  loadItems()
}

const showDetail = (item) => {
  selectedItem.value = item
  detailDrawerVisible.value = true
}

const showOrderDialog = (item) => {
  selectedItem.value = item
  resetOrderForm()
  orderDialogVisible.value = true
}

const isFavorited = (itemId) => favorites.value.some((item) => item.id === itemId)

const toggleFavorite = async (item) => {
  try {
    if (isFavorited(item.id)) {
      await secondhandApi.unfavoriteItem(item.id)
      ElMessage.success('取消收藏成功')
      favorites.value = favorites.value.filter((favorite) => favorite.id !== item.id)
      return
    }

    await secondhandApi.favoriteItem(item.id)
    ElMessage.success('收藏成功')
    favorites.value.push(item)
  } catch (error) {
    console.error('操作失败:', error)
  }
}

const submitOrder = async () => {
  if (!orderFormRef.value || !selectedItem.value) return

  await orderFormRef.value.validate(async (valid) => {
    if (!valid) return

    submittingOrder.value = true
    try {
      const orderResult = await secondhandApi.createOrder(orderForm.value)
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
      console.error('二手商品下单失败:', error)
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
      await secondhandApi.publishItem({
        ...publishForm.value,
        images: publishForm.value.images
      })
      ElMessage.success('发布成功，等待审核')
      publishDialogVisible.value = false
      publishForm.value = { title: '', category: '', price: 0, description: '', images: [] }
      loadItems()
    } catch (error) {
      console.error('发布失败:', error)
    } finally {
      publishing.value = false
    }
  })
}

onMounted(() => {
  loadItems()
  loadFavorites()
})
</script>

<style scoped>
.secondhand-page {
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

.item-list {
  margin-top: 20px;
}

.item-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
}

.item-card:hover {
  transform: translateY(-5px);
}

.item-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.item-image :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.item-info {
  padding: 15px 0 0;
}

.item-info h3 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.item-footer .price {
  font-size: 20px;
  color: #f56c6c;
  font-weight: bold;
}

.item-detail h2 {
  margin: 20px 0 10px;
  color: #333;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 15px 0;
}

.detail-meta .price {
  font-size: 24px;
  color: #f56c6c;
  font-weight: bold;
}

.detail-content h4 {
  margin: 20px 0 10px;
  color: #333;
}

.detail-content p {
  color: #666;
  line-height: 1.8;
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
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
  font-size: 24px;
}

.order-preview--danger strong {
  color: #f56c6c;
}
</style>

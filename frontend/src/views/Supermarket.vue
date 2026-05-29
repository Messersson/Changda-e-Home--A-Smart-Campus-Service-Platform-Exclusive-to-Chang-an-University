<template>
  <div class="supermarket-page">
    <div class="page-header">
      <h2>校园超市</h2>
      <div class="header-actions">
        <el-input v-model="keyword" placeholder="搜索商品" prefix-icon="Search" style="width: 200px; margin-right: 10px" @input="loadProducts" />
        <el-button v-if="!isGuest" type="primary" :icon="ShoppingCart" @click="cartDrawerVisible = true">
          购物车 ({{ cartCount }})
        </el-button>
        <el-tag v-else type="info">游客仅可浏览</el-tag>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="4">
        <el-card class="category-card">
          <div class="category-title">商品分类</div>
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
      <el-col :span="20">
        <el-row :gutter="20" class="product-list">
          <el-col v-for="product in products" :key="product.id" :xs="24" :sm="12" :md="8" :lg="6">
            <el-card class="product-card" shadow="hover">
              <div class="product-image">
                <el-image :src="product.image" fit="cover" />
                <div v-if="product.stock <= 10" class="stock-warning">库存紧张</div>
              </div>
              <div class="product-info">
                <h3>{{ product.name }}</h3>
                <p class="spec">{{ product.spec }}</p>
                <p v-if="merchantContact(product)" class="merchant-contact">
                  商家联系方式：{{ merchantContact(product) }}
                </p>
                <div class="product-footer">
                  <span class="price">¥{{ Number(product.price).toFixed(2) }}</span>
                  <span class="stock">库存: {{ product.stock }}</span>
                </div>
                <el-button 
                  v-if="!isGuest"
                  type="primary" 
                  size="small" 
                  style="width: 100%; margin-top: 10px"
                  :disabled="product.stock === 0"
                  @click="addToCart(product)"
                >
                  {{ product.stock === 0 ? '已售罄' : '加入购物车' }}
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-empty v-if="products.length === 0" description="暂无商品" />
      </el-col>
    </el-row>

    <el-drawer v-model="cartDrawerVisible" title="购物车" size="450px">
      <div class="cart-drawer">
        <div v-if="!cart || cart.items.length === 0" class="empty">购物车为空</div>
        <div v-else>
          <div v-for="item in cart.items" :key="item.productId" class="cart-item">
            <div class="item-image">
              <el-image :src="getProductImage(item.productId)" fit="cover" />
            </div>
            <div class="item-info">
              <h4>{{ item.productName }}</h4>
              <p class="spec">{{ getProductSpec(item.productId) }}</p>
              <div class="item-footer">
                  <span class="price">¥{{ Number(item.price).toFixed(2) }}</span>
                  <div class="item-quantity">
                    <el-button size="small" @click="updateCartItem(item, -1)">-</el-button>
                    <span>{{ item.quantity }}</span>
                    <el-button size="small" @click="updateCartItem(item, 1)">+</el-button>
                  </div>
                </div>
            </div>
            <el-button type="danger" :icon="Delete" circle @click="removeFromCart(item)" />
          </div>
          <el-divider />
          <div class="cart-total">
            <span>总计：</span>
            <span class="total-price">¥{{ Number(cart.totalAmount).toFixed(2) }}</span>
          </div>
          <el-button type="primary" style="width: 100%; margin-top: 20px" @click="checkoutDrawerVisible = true">
            去结算
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="checkoutDrawerVisible" title="结算" size="400px">
      <el-form :model="checkoutForm" label-width="80px">
        <el-form-item label="收货地址" required>
          <el-input v-model="checkoutForm.address" type="textarea" :rows="3" placeholder="请输入收货地址" />
        </el-form-item>
        <el-form-item label="联系电话" required>
          <el-input v-model="checkoutForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="checkoutForm.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
        </el-form-item>
        <div class="checkout-total">
          <span>订单总额：</span>
          <span class="total-price">¥{{ cart?.totalAmount ? Number(cart.totalAmount).toFixed(2) : '0.00' }}</span>
        </div>
        <el-button type="primary" style="width: 100%; margin-top: 20px" @click="submitOrder" :loading="submitting">
          提交订单
        </el-button>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ShoppingCart, Grid, Delete } from '@element-plus/icons-vue'
import { supermarketApi } from '@/api'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { startPaymentByOrderId } from '@/utils/paymentFlow'

const categories = ref([])
const products = ref([])
const selectedCategory = ref('')
const keyword = ref('')
const cart = ref(null)
const cartDrawerVisible = ref(false)
const checkoutDrawerVisible = ref(false)
const submitting = ref(false)
const router = useRouter()
const userStore = useUserStore()
const isGuest = computed(() => !userStore.token)
const checkoutForm = ref({
  address: '',
  phone: '',
  remark: ''
})

const topCategories = computed(() => {
  return categories.value.filter(c => !c.parentId)
})

const subCategories = computed(() => {
  return (parentId) => {
    return categories.value.filter(c => c.parentId === parentId)
  }
})

const cartCount = computed(() => {
  return cart.value?.items.length || 0
})

const loadCategories = async () => {
  try {
    const res = await supermarketApi.getCategories()
    categories.value = res.data
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const loadProducts = async () => {
  try {
    const res = await supermarketApi.getProducts({
      categoryId: selectedCategory.value,
      keyword: keyword.value
    })
    products.value = res.data
  } catch (error) {
    console.error('加载商品列表失败:', error)
  }
}

const handleCategorySelect = (index) => {
  selectedCategory.value = index
  loadProducts()
}

const addToCart = async (product) => {
  if (isGuest.value) {
    ElMessage.warning('游客只能浏览商品，请登录后加入购物车')
    return
  }
  try {
    await supermarketApi.addToCart({
      productId: product.id,
      quantity: 1
    })
    ElMessage.success('已加入购物车')
    loadCart()
  } catch (error) {
    console.error('加入购物车失败:', error)
  }
}

const loadCart = async () => {
  if (isGuest.value) {
    cart.value = null
    return
  }
  try {
    const res = await supermarketApi.getCart()
    cart.value = res.data
  } catch (error) {
    console.error('加载购物车失败:', error)
  }
}

const merchantContact = (item) => item.merchantPhone || item.merchantEmail || item.merchantAddress || ''

const updateCartItem = async (item, delta) => {
  const newQuantity = item.quantity + delta
  if (newQuantity <= 0) {
    removeFromCart(item)
    return
  }
  try {
    await supermarketApi.updateCart({
      productId: item.productId,
      quantity: newQuantity
    })
    loadCart()
  } catch (error) {
    console.error('更新购物车失败:', error)
  }
}

const removeFromCart = async (item) => {
  try {
    await supermarketApi.removeFromCart({
      productId: item.productId
    })
    ElMessage.success('已从购物车移除')
    loadCart()
  } catch (error) {
    console.error('移除商品失败:', error)
  }
}

const getProductImage = (productId) => {
  const product = products.value.find(p => p.id === productId)
  return product?.image || ''
}

const getProductSpec = (productId) => {
  const product = products.value.find(p => p.id === productId)
  return product?.spec || ''
}

const submitOrder = async () => {
  if (!checkoutForm.value.address) {
    ElMessage.warning('请输入收货地址')
    return
  }
  if (!checkoutForm.value.phone) {
    ElMessage.warning('请输入联系电话')
    return
  }
  submitting.value = true
  try {
    const orderResult = await supermarketApi.checkout(checkoutForm.value)
    const orderId = orderResult?.data?.orderId
    if (!orderId) {
      ElMessage.error('下单成功但未获取到订单号，请前往我的订单支付')
      return
    }

    ElMessage.success('下单成功，正在进入支付页')
    checkoutForm.value = { address: '', phone: '', remark: '' }
    checkoutDrawerVisible.value = false
    cartDrawerVisible.value = false
    loadCart()
    await startPaymentByOrderId(orderId, router)
  } catch (error) {
    console.error('下单失败:', error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadProducts()
  if (!isGuest.value) {
    loadCart()
  }
})
</script>

<style scoped>
.supermarket-page {
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

.header-actions {
  display: flex;
  align-items: center;
}

.category-card {
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.category-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.category-menu {
  border: none;
}

.sub-category {
  padding-left: 40px !important;
}

.product-list {
  margin-top: 20px;
}

.product-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
  position: relative;
}

.product-image :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.stock-warning {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(245, 108, 108, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.product-info {
  padding: 15px 0 0;
}

.product-info h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-info .spec {
  margin: 0 0 10px;
  color: #999;
  font-size: 14px;
}

.merchant-contact {
  margin: 0 0 10px;
  color: #4f7cff;
  font-size: 13px;
  line-height: 1.5;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-footer .price {
  font-size: 18px;
  color: #f56c6c;
  font-weight: bold;
}

.product-footer .stock {
  color: #999;
  font-size: 14px;
}

.cart-drawer .empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.cart-item {
  display: flex;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-image {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.item-image :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.item-info {
  flex: 1;
}

.item-info h4 {
  margin: 0 0 5px;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-info .spec {
  margin: 0 0 10px;
  color: #999;
  font-size: 12px;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-footer .price {
  color: #f56c6c;
  font-weight: bold;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cart-total,
.checkout-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  margin-top: 20px;
}

.cart-total .total-price,
.checkout-total .total-price {
  color: #f56c6c;
  font-size: 24px;
}
</style>

<template>
  <div class="snack-page">
    <div class="page-header">
      <h2>东门小吃摊</h2>
      <el-select v-model="selectedMerchant" placeholder="选择商家" clearable style="width: 200px" @change="loadSnacks">
        <el-option v-for="merchant in merchants" :key="merchant" :label="merchant" :value="merchant" />
      </el-select>
    </div>
    <el-row :gutter="20" class="snack-list">
      <el-col v-for="snack in snacks" :key="snack.id" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="snack-card" shadow="hover" @click="showDetail(snack)">
          <div class="snack-image">
            <el-image :src="snack.image" fit="cover" />
          </div>
          <div class="snack-info">
            <h3>{{ snack.name }}</h3>
            <p class="merchant">{{ snack.merchant }}</p>
            <p class="description">{{ snack.description }}</p>
            <div class="snack-footer">
            <span class="price">¥{{ Number(snack.price).toFixed(2) }}</span>
            <el-button type="primary" size="small" @click.stop="addToOrder(snack)">点单</el-button>
          </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-drawer v-model="orderDrawerVisible" title="我的订单" size="400px">
      <div class="order-drawer">
        <div v-if="orderItems.length === 0" class="empty">暂无订单</div>
        <div v-else>
          <div v-for="(item, index) in orderItems" :key="index" class="order-item">
            <div class="item-info">
              <span class="name">{{ item.snackName }}</span>
              <span class="price">¥{{ Number(item.price).toFixed(2) }}</span>
            </div>
            <div class="item-quantity">
              <el-button size="small" @click="updateQuantity(index, -1)">-</el-button>
              <span>{{ item.quantity }}</span>
              <el-button size="small" @click="updateQuantity(index, 1)">+</el-button>
            </div>
          </div>
          <el-divider />
          <div class="order-total">
            <span>总计：</span>
            <span class="total-price">¥{{ totalAmount.toFixed(2) }}</span>
          </div>
          <el-input v-model="remark" type="textarea" placeholder="备注信息（可选）" :rows="3" style="margin-top: 20px" />
          <el-button type="primary" style="width: 100%; margin-top: 20px" @click="submitOrder" :loading="submitting">提交订单</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="detailDrawerVisible" title="菜品详情" size="400px">
      <div v-if="selectedSnack" class="snack-detail">
        <el-image :src="selectedSnack.image" fit="cover" style="width: 100%; height: 200px" />
        <h2>{{ selectedSnack.name }}</h2>
        <p class="merchant">商家：{{ selectedSnack.merchant }}</p>
        <p class="price">价格：¥{{ Number(selectedSnack.price).toFixed(2) }}</p>
        <p class="description">描述：{{ selectedSnack.description }}</p>
        <el-button type="primary" style="width: 100%; margin-top: 20px" @click="addToOrder(selectedSnack)">点单</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { snackApi } from '@/api'

const merchants = ref([])
const snacks = ref([])
const selectedMerchant = ref('')
const orderDrawerVisible = ref(false)
const detailDrawerVisible = ref(false)
const orderItems = ref([])
const remark = ref('')
const submitting = ref(false)
const selectedSnack = ref(null)

const totalAmount = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + item.subtotal, 0)
})

const loadMerchants = async () => {
  try {
    const res = await snackApi.getMerchants()
    merchants.value = res.data
  } catch (error) {
    console.error('加载商家列表失败:', error)
  }
}

const loadSnacks = async () => {
  try {
    const res = await snackApi.getSnacks({ merchant: selectedMerchant.value })
    snacks.value = res.data
  } catch (error) {
    console.error('加载菜品列表失败:', error)
  }
}

const showDetail = (snack) => {
  selectedSnack.value = snack
  detailDrawerVisible.value = true
}

const addToOrder = (snack) => {
  const price = Number(snack.price)
  const existingItem = orderItems.value.find(item => item.snackId === snack.id)
  if (existingItem) {
    existingItem.quantity++
    existingItem.subtotal = existingItem.price * existingItem.quantity
  } else {
    orderItems.value.push({
      snackId: snack.id,
      snackName: snack.name,
      price: price,
      quantity: 1,
      subtotal: price
    })
  }
  orderDrawerVisible.value = true
  ElMessage.success('已加入订单')
}

const updateQuantity = (index, delta) => {
  const item = orderItems.value[index]
  item.quantity += delta
  item.subtotal = item.price * item.quantity
  if (item.quantity <= 0) {
    orderItems.value.splice(index, 1)
  }
}

const submitOrder = async () => {
  if (orderItems.value.length === 0) {
    ElMessage.warning('请先选择菜品')
    return
  }
  submitting.value = true
  try {
    await snackApi.createOrder({
      items: orderItems.value.map(item => ({
        snackId: item.snackId,
        quantity: item.quantity
      })),
      remark: remark.value
    })
    ElMessage.success('下单成功')
    orderItems.value = []
    remark.value = ''
    orderDrawerVisible.value = false
  } catch (error) {
    console.error('下单失败:', error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadMerchants()
  loadSnacks()
})
</script>

<style scoped>
.snack-page {
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

.snack-list {
  margin-top: 20px;
}

.snack-card {
  cursor: pointer;
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.snack-card:hover {
  transform: translateY(-5px);
}

.snack-image {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.snack-image :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.snack-info {
  padding: 15px 0 0;
}

.snack-info h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: #333;
}

.snack-info .merchant {
  margin: 0 0 8px;
  color: #999;
  font-size: 14px;
}

.snack-info .description {
  margin: 0 0 15px;
  color: #666;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snack-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.snack-footer .price {
  font-size: 20px;
  color: #f56c6c;
  font-weight: bold;
}

.order-drawer .empty {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.item-info {
  flex: 1;
}

.item-info .name {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.item-info .price {
  color: #f56c6c;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
}

.order-total .total-price {
  color: #f56c6c;
  font-size: 24px;
}

.snack-detail h2 {
  margin: 20px 0 10px;
  color: #333;
}

.snack-detail .merchant,
.snack-detail .price,
.snack-detail .description {
  margin: 10px 0;
  color: #666;
}

.snack-detail .price {
  color: #f56c6c;
  font-size: 20px;
  font-weight: bold;
}
</style>

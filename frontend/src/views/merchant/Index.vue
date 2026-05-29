<template>
  <div class="merchant-shell">
    <el-container class="merchant-layout">
      <el-aside width="248px" class="merchant-aside">
        <div class="merchant-brand">
          <div class="merchant-brand__icon">M</div>
          <div>
            <strong>商家管理后台</strong>
            <span>Merchant Console</span>
          </div>
        </div>

        <el-menu :default-active="activeMenu" router class="merchant-menu">
          <el-menu-item index="/merchant/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>经营概览</span>
          </el-menu-item>
          <el-menu-item index="/merchant/snacks">
            <el-icon><Bowl /></el-icon>
            <span>小吃商品</span>
          </el-menu-item>
          <el-menu-item index="/merchant/products">
            <el-icon><ShoppingCart /></el-icon>
            <span>超市商品</span>
          </el-menu-item>
          <el-menu-item index="/merchant/orders">
            <el-icon><Tickets /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
          <el-menu-item index="/merchant/after-sales">
            <el-icon><RefreshLeft /></el-icon>
            <span>退款退货</span>
          </el-menu-item>
          <el-menu-item index="/forum">
            <el-icon><ChatDotRound /></el-icon>
            <span>浏览论坛</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="merchant-header">
          <div>
            <h1>{{ currentTitle }}</h1>
            <p>{{ profile?.storeName || userStore.user?.name || '商家账号' }}</p>
          </div>
          <el-dropdown @command="handleCommand">
            <el-button>
              {{ userStore.user?.name || '商家' }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="forum">浏览论坛</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-header>

        <el-main class="merchant-main">
          <router-view v-slot="{ Component, route }">
            <transition name="page-fade-slide" mode="out-in">
              <keep-alive>
                <component :is="Component" v-if="route.meta.keepAlive" :key="route.name" />
              </keep-alive>
            </transition>
            <transition name="page-fade-slide" mode="out-in">
              <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { merchantApi } from '@/api'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const profile = ref(null)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '商家后台')

const handleCommand = async (command) => {
  if (command === 'forum') {
    router.push('/forum')
    return
  }
  if (command === 'logout') {
    await ElMessageBox.confirm('确定退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/login')
  }
}

onMounted(async () => {
  const result = await merchantApi.getProfile()
  profile.value = result.data
})
</script>

<style scoped>
.merchant-shell {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #eef5ff 0%, #f7fafc 48%, #ecfff8 100%);
}

.merchant-layout {
  min-height: calc(100vh - 40px);
  gap: 18px;
}

.merchant-aside {
  padding: 18px;
  border-radius: 18px;
  background: #13213f;
  color: #fff;
}

.merchant-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.merchant-brand__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #16a085, #4f7cff);
  font-weight: 900;
}

.merchant-brand strong,
.merchant-brand span {
  display: block;
}

.merchant-brand span {
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
}

.merchant-menu {
  border: none;
  background: transparent;
}

.merchant-menu :deep(.el-menu-item) {
  height: 48px;
  margin-bottom: 8px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.merchant-menu :deep(.el-menu-item:hover),
.merchant-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.merchant-header {
  height: auto;
  padding: 20px 24px;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
}

.merchant-header h1 {
  margin: 0 0 6px;
  font-size: 28px;
  color: #13213f;
}

.merchant-header p {
  margin: 0;
  color: #64748b;
}

.merchant-main {
  padding: 18px 0 0;
}
</style>

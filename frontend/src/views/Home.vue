<template>
  <div class="home-shell campus-page" :style="homeShellStyle">
    <a class="skip-link" href="#campus-main">跳转到主要内容</a>
    <div class="home-shell__glow home-shell__glow--one"></div>
    <div class="home-shell__glow home-shell__glow--two"></div>

    <el-container class="home-layout">
      <el-header class="home-header glass-panel">
        <div class="home-brand">
          <div class="home-brand__icon">长</div>
          <div>
            <div class="brand-chip">CHD Campus Service</div>
            <h1>长安大学校园服务平台</h1>
            <p>一站式校园生活、学习与交流服务中心</p>
          </div>
        </div>

        <div class="home-actions">
          <div
            class="status-pill glass-panel"
            :aria-label="connectionLabel"
            role="status"
          >
            <span
              class="status-pill__dot"
              :class="{ 'is-offline': connectionStatus === 'disconnected', 'is-checking': !isConnected && connectionStatus !== 'disconnected' }"
            ></span>
            {{ connectionLabel }}
          </div>

          <el-dropdown @command="handleCommand">
            <div class="user-info glass-panel">
              <el-avatar :size="38" class="user-avatar">
                {{ (userStore.user?.name || '游').slice(0, 1) }}
              </el-avatar>
              <div class="user-copy">
                <strong>{{ userStore.user?.name || '访客浏览' }}</strong>
                <span>{{ roleLabel }}</span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isGuest" command="login">登录平台</el-dropdown-item>
                <el-dropdown-item v-if="!isGuest" command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item v-if="userStore.user?.role === 'admin'" command="admin">后台管理</el-dropdown-item>
                <el-dropdown-item v-if="isMerchant" command="merchant">商家后台</el-dropdown-item>
                <el-dropdown-item v-if="!isGuest" command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container class="home-body">
        <el-aside width="248px" class="home-aside glass-panel" aria-label="校园功能导航">
          <div class="aside-title">
            <span>功能导航</span>
            <small>Campus Modules</small>
          </div>

          <el-menu :default-active="activeMenu" class="home-menu" router @select="handleMenuSelect">
            <el-menu-item v-if="!isMerchant" index="/snack">
              <el-icon><Bowl /></el-icon>
              <span>东门小吃摊</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant" index="/supermarket">
              <el-icon><ShoppingCart /></el-icon>
              <span>校园超市</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant && !isGuest" index="/tutor">
              <el-icon><Reading /></el-icon>
              <span>家教板块</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant" index="/secondhand">
              <el-icon><Goods /></el-icon>
              <span>二手交易</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant && !isGuest" index="/driving-school">
              <el-icon><Van /></el-icon>
              <span>驾校板块</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant" index="/study-material">
              <el-icon><Document /></el-icon>
              <span>学习资料</span>
            </el-menu-item>
            <el-menu-item index="/forum">
              <el-icon><ChatDotRound /></el-icon>
              <span>校园论坛</span>
            </el-menu-item>
            <el-menu-item v-if="!isMerchant && !isGuest" index="/orders">
              <el-icon><Tickets /></el-icon>
              <span>我的订单</span>
            </el-menu-item>
          </el-menu>

          <div class="aside-footer glass-panel">
            <strong>今日建议</strong>
            <p>{{ isGuest ? '访客可浏览和查找公开信息，登录后可下单、发布、收藏和评论。' : '切换板块会保留已访问页面状态，查资料、看论坛和下单切换会更连贯。' }}</p>
          </div>
        </el-aside>

        <el-main id="campus-main" class="home-main">
          <div class="hero-banner glass-panel">
            <div>
              <div class="brand-chip brand-chip--dark">Campus Flow</div>
              <h2>把生活服务、学习资源和校园交流整合到一个更顺手的入口</h2>
              <p>更轻、更稳、更有校园感的界面体验，支持快速浏览与多板块切换。</p>
            </div>

            <div class="hero-stats">
              <div class="hero-stat glass-panel">
                <strong>8+</strong>
                <span>核心板块</span>
              </div>
              <div class="hero-stat glass-panel">
                <strong>24h</strong>
                <span>在线服务</span>
              </div>
            </div>
          </div>

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

    <UserProfileDialog v-model="profileDialogVisible" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import UserProfileDialog from '@/components/UserProfileDialog.vue'
import campusUserBg from '@/assets/bg-campus-user.svg'
import connectionManager from '@/utils/connectionManager'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const profileDialogVisible = ref(false)
const connectionStatus = ref(connectionManager.getConnectionStatus().status)

const homeShellStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.46)), url("${campusUserBg}")`
}

const activeMenu = computed(() => route.path)
const isGuest = computed(() => !userStore.token)
const isMerchant = computed(() => userStore.user?.role === 'merchant')
const isConnected = computed(() => connectionStatus.value === 'connected')
const connectionLabel = computed(() => {
  if (connectionStatus.value === 'connected') return '校园服务在线'
  if (connectionStatus.value === 'connecting') return '正在连接服务'
  if (connectionStatus.value === 'checking') return '正在检查服务'
  return '服务暂不可用'
})
const roleLabel = computed(() => {
  if (isGuest.value) return '游客只读'
  if (userStore.user?.role === 'admin') return '管理员'
  if (userStore.user?.role === 'merchant') return '商家'
  return '同学'
})

const updateConnectionStatus = (status) => {
  connectionStatus.value = status
}

onMounted(() => {
  connectionManager.addConnectionListener(updateConnectionStatus)
  updateConnectionStatus(connectionManager.getConnectionStatus().status)
})

onUnmounted(() => {
  connectionManager.removeConnectionListener(updateConnectionStatus)
})

const handleMenuSelect = (index) => {
  if (index && index !== route.path) {
    router.push(index)
  }
}

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      profileDialogVisible.value = true
      break
    case 'login':
      router.push('/login')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'merchant':
      router.push('/merchant/dashboard')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        userStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch (error) {
        console.log('取消退出登录', error)
      }
      break
  }
}
</script>

<style scoped>
.skip-link {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 20;
  padding: 10px 14px;
  border-radius: 12px;
  background: #fff;
  color: #13213f;
  box-shadow: var(--app-shadow);
  transform: translateY(calc(-100% - 16px));
  transition: transform 0.2s ease;
}

.skip-link:focus {
  transform: translateY(0);
}

.home-shell {
  position: relative;
  min-height: 100vh;
  padding: 24px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.home-shell__glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
}

.home-shell__glow--one {
  top: 140px;
  left: -60px;
  width: 260px;
  height: 260px;
  background: rgba(79, 124, 255, 0.2);
}

.home-shell__glow--two {
  right: 40px;
  bottom: 80px;
  width: 300px;
  height: 300px;
  background: rgba(0, 194, 168, 0.14);
}

.home-layout {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 48px);
}

.home-header {
  height: auto;
  margin-bottom: 20px;
  padding: 20px 24px;
  border-radius: var(--app-radius-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(135deg, rgba(59, 90, 219, 0.9), rgba(120, 92, 245, 0.82));
  color: #fff;
}

.home-brand {
  display: flex;
  align-items: center;
  gap: 18px;
}

.home-brand__icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.home-brand h1 {
  margin: 10px 0 6px;
  font-size: 32px;
  font-weight: 800;
}

.home-brand p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
}

.home-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  padding: 12px 16px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.status-pill__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #48f0ae;
  box-shadow: 0 0 0 6px rgba(72, 240, 174, 0.18);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
}

.user-avatar {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 800;
}

.user-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-copy span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.76);
}

.home-body {
  gap: 20px;
}

.home-aside {
  padding: 18px;
  border-radius: var(--app-radius-xl);
  align-self: stretch;
  background: rgba(255, 255, 255, 0.66);
}

.aside-title {
  padding: 8px 8px 18px;
}

.aside-title span {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.aside-title small {
  color: var(--app-text-soft);
}

.home-menu {
  border: none;
  background: transparent;
}

.home-menu :deep(.el-menu-item) {
  height: 50px;
  margin-bottom: 8px;
  border-radius: 16px;
  color: #334155;
  transition: transform 0.22s ease, background-color 0.22s ease;
}

.home-menu :deep(.el-menu-item:hover) {
  background: rgba(79, 124, 255, 0.08);
  transform: translateX(4px);
}

.home-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.14), rgba(123, 97, 255, 0.12));
  color: var(--app-primary);
  font-weight: 700;
}

.aside-footer {
  margin-top: 18px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.08), rgba(0, 194, 168, 0.08));
}

.aside-footer strong {
  display: block;
  margin-bottom: 8px;
}

.aside-footer p {
  margin: 0;
  line-height: 1.7;
  color: var(--app-text-soft);
}

.home-main {
  min-width: 0;
  padding: 0;
  background: transparent;
}

.hero-banner {
  margin-bottom: 20px;
  padding: 24px 28px;
  border-radius: var(--app-radius-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: rgba(255, 255, 255, 0.74);
}

.brand-chip--dark {
  color: var(--app-primary);
  background: rgba(79, 124, 255, 0.09);
}

.hero-banner h2 {
  margin: 14px 0 10px;
  font-size: 28px;
  line-height: 1.3;
}

.hero-banner p {
  margin: 0;
  max-width: 680px;
  color: var(--app-text-soft);
}

.hero-stats {
  display: flex;
  gap: 14px;
}

.hero-stat {
  min-width: 116px;
  padding: 18px;
  border-radius: 22px;
  text-align: center;
  background: rgba(255, 255, 255, 0.65);
}

.hero-stat strong {
  display: block;
  font-size: 28px;
  color: var(--app-primary);
}

.hero-stat span {
  color: var(--app-text-soft);
  font-size: 13px;
}

.status-pill__dot.is-offline {
  background: #ffb454;
  box-shadow: 0 0 0 6px rgba(255, 180, 84, 0.18);
}

.status-pill__dot.is-checking {
  background: #ffd166;
  box-shadow: 0 0 0 6px rgba(255, 209, 102, 0.18);
}

@media (max-width: 1100px) {
  .home-header,
  .hero-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .home-actions,
  .hero-stats {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 900px) {
  .home-shell {
    padding: 14px;
  }

  .home-body {
    display: block;
  }

  .home-aside {
    width: 100% !important;
    margin-bottom: 16px;
  }
}

@media (max-width: 640px) {
  .home-shell {
    padding: 12px;
    background-attachment: scroll;
  }

  .home-shell__glow {
    display: none;
  }

  .home-layout {
    min-height: calc(100vh - 24px);
  }

  .home-header {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 14px 12px;
    border-radius: 20px;
  }

  .home-brand {
    min-width: 0;
    gap: 9px;
  }

  .home-brand__icon {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    font-size: 19px;
  }

  .home-brand .brand-chip {
    display: none;
  }

  .home-brand h1 {
    margin: 0;
    font-size: clamp(14px, 4.1vw, 19px);
    line-height: 1.35;
    white-space: nowrap;
  }

  .home-brand p {
    display: none;
  }

  .home-actions {
    flex: 0 0 auto;
    width: auto;
    gap: 8px;
  }

  .status-pill {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .status-pill__dot {
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 4px rgba(72, 240, 174, 0.18);
  }

  .status-pill__dot.is-offline {
    box-shadow: 0 0 0 4px rgba(255, 180, 84, 0.18);
  }

  .status-pill__dot.is-checking {
    box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.18);
  }

  .user-info {
    gap: 6px;
    padding: 5px 7px;
    border-radius: 14px;
  }

  .user-copy {
    max-width: 58px;
    min-width: 0;
  }

  .user-copy strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-copy span {
    display: none;
  }

  .home-body {
    display: block;
  }

  .home-aside {
    align-self: auto;
    overflow-x: auto;
    min-height: 0;
    height: auto !important;
    flex: none;
    margin-bottom: 12px;
    padding: 7px 8px 5px;
    border-radius: 18px;
    -webkit-overflow-scrolling: touch;
    scrollbar-color: rgba(79, 124, 255, 0.42) transparent;
    scrollbar-width: thin;
  }

  .home-aside::-webkit-scrollbar {
    height: 3px;
  }

  .home-aside::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(79, 124, 255, 0.42);
  }

  .aside-title,
  .aside-footer {
    display: none;
  }

  .home-menu {
    display: flex;
    width: max-content;
    min-width: 100%;
    border: 0;
  }

  .home-menu :deep(.el-menu-item) {
    flex: 0 0 auto;
    height: 42px;
    margin: 0 4px 0 0;
    padding: 0 12px;
    border-radius: 13px;
    white-space: nowrap;
  }

  .home-menu :deep(.el-menu-item:hover) {
    transform: none;
  }

  .hero-banner {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    margin-bottom: 12px;
    padding: 18px;
    border-radius: 20px;
  }

  .hero-banner h2 {
    margin: 10px 0 8px;
    font-size: clamp(20px, 5.5vw, 26px);
  }

  .hero-banner p {
    font-size: 14px;
    line-height: 1.65;
  }

  .hero-stats {
    gap: 8px;
  }

  .hero-stat {
    flex: 1;
    min-width: 0;
    padding: 11px 8px;
    border-radius: 15px;
  }

  .hero-stat strong {
    font-size: 21px;
  }

  .hero-stat span {
    font-size: 12px;
  }
}

@media (max-width: 380px) {
  .status-pill {
    display: none;
  }

  .home-header {
    padding-inline: 10px;
  }

  .home-brand {
    gap: 7px;
  }

  .home-brand h1 {
    font-size: 14px;
  }

  .user-copy {
    max-width: 48px;
  }
}
</style>

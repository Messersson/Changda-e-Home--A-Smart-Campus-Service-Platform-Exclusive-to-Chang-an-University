<template>
  <div class="home-shell campus-page" :style="homeShellStyle">
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
          <div class="status-pill glass-panel">
            <span class="status-pill__dot"></span>
            校园服务在线
          </div>
          <el-dropdown @command="handleCommand">
            <div class="user-info glass-panel">
              <el-avatar :size="38" class="user-avatar">
                {{ (userStore.user?.name || 'U').slice(0, 1) }}
              </el-avatar>
              <div class="user-copy">
                <strong>{{ userStore.user?.name || '校园用户' }}</strong>
                <span>{{ userStore.user?.role === 'admin' ? '管理员' : '同学' }}</span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item v-if="userStore.user?.role === 'admin'" command="admin">后台管理</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container class="home-body">
        <el-aside width="248px" class="home-aside glass-panel">
          <div class="aside-title">
            <span>功能导航</span>
            <small>Campus Modules</small>
          </div>

          <el-menu :default-active="activeMenu" class="home-menu" router @select="handleMenuSelect">
            <el-menu-item index="/snack">
              <el-icon><Bowl /></el-icon>
              <span>东门小吃摊</span>
            </el-menu-item>
            <el-menu-item index="/supermarket">
              <el-icon><ShoppingCart /></el-icon>
              <span>校园超市</span>
            </el-menu-item>
            <el-menu-item index="/tutor">
              <el-icon><Reading /></el-icon>
              <span>家教板块</span>
            </el-menu-item>
            <el-menu-item index="/secondhand">
              <el-icon><Goods /></el-icon>
              <span>二手交易</span>
            </el-menu-item>
            <el-menu-item index="/driving-school">
              <el-icon><Van /></el-icon>
              <span>驾校板块</span>
            </el-menu-item>
            <el-menu-item index="/study-material">
              <el-icon><Document /></el-icon>
              <span>学习资料</span>
            </el-menu-item>
            <el-menu-item index="/forum">
              <el-icon><ChatDotRound /></el-icon>
              <span>校园论坛</span>
            </el-menu-item>
          </el-menu>

          <div class="aside-footer glass-panel">
            <strong>今日建议</strong>
            <p>切换板块会保留已访问页面状态，查资料与逛论坛更连贯。</p>
          </div>
        </el-aside>

        <el-main class="home-main">
          <div class="hero-banner glass-panel">
            <div>
              <div class="brand-chip brand-chip--dark">Campus Flow</div>
              <h2>把生活服务、学习资源和校园交流聚合到一个空间</h2>
              <p>更轻、更稳、更有校园感的界面体验，支持快速浏览与多板块切换。</p>
            </div>
            <div class="hero-stats">
              <div class="hero-stat glass-panel">
                <strong>7+</strong>
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import campusUserBg from '@/assets/bg-campus-user.svg'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const homeShellStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.46)), url(${campusUserBg})`
}

const activeMenu = computed(() => route.path)

const handleMenuSelect = (index) => {
  if (index && index !== route.path) {
    router.push(index)
  }
}

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      ElMessage.info('个人信息功能开发中')
      break
    case 'admin':
      router.push('/admin')
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
        console.log('取消退出登录')
      }
      break
  }
}
</script>

<style scoped>
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
</style>

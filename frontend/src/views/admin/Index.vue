<template>
  <div class="admin-shell campus-page" :style="adminShellStyle">
    <div class="admin-shell__glow admin-shell__glow--one"></div>
    <div class="admin-shell__glow admin-shell__glow--two"></div>

    <el-container class="admin-layout">
      <el-aside width="260px" class="admin-aside glass-panel">
        <div class="admin-brand">
          <div class="admin-brand__icon">A</div>
          <div>
            <strong>校园管理台</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <div class="admin-aside__summary glass-panel">
          <span class="aside-badge">Platform Ops</span>
          <h3>统一管理校园服务运营</h3>
          <p>覆盖用户、订单、资料、论坛与服务内容的全链路管理。</p>
        </div>

        <el-menu :default-active="activeMenu" router class="admin-menu">
          <el-menu-item index="/admin/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据统计</span>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/merchants">
            <el-icon><Shop /></el-icon>
            <span>商家管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/snacks">
            <el-icon><Bowl /></el-icon>
            <span>小吃摊管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/supermarket">
            <el-icon><ShoppingCart /></el-icon>
            <span>超市管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/tutors">
            <el-icon><Reading /></el-icon>
            <span>家教管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/secondhand">
            <el-icon><Goods /></el-icon>
            <span>二手交易管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/study-materials">
            <el-icon><Document /></el-icon>
            <span>学习资料管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/forum">
            <el-icon><ChatDotRound /></el-icon>
            <span>论坛管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/orders">
            <el-icon><Tickets /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/driving-schools">
            <el-icon><Van /></el-icon>
            <span>驾校管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container class="admin-main-layout">
        <el-header class="admin-header glass-panel">
          <div class="admin-header__copy">
            <div class="brand-chip brand-chip--dark">Operations Center</div>
            <h1>{{ currentTitle }}</h1>
            <p>更直观地掌握平台数据、处理业务信息并维护校园服务内容。</p>
          </div>

          <div class="admin-header__actions">
            <div class="admin-status glass-panel">
              <span class="admin-status__dot"></span>
              系统运行中
            </div>

            <el-dropdown @command="handleCommand">
              <div class="admin-user glass-panel">
                <el-avatar :size="42" class="admin-user__avatar">
                  {{ (userStore.user?.name || 'A').slice(0, 1) }}
                </el-avatar>
                <div class="admin-user__copy">
                  <strong>{{ userStore.user?.name || '管理员' }}</strong>
                  <span>后台账号</span>
                </div>
                <el-icon><ArrowDown /></el-icon>
              </div>

              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="home">返回用户端</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="admin-main">
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
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import UserProfileDialog from '@/components/UserProfileDialog.vue'
import adminConsoleBg from '@/assets/bg-admin-console.svg'
import { Shop } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const profileDialogVisible = ref(false)

const adminShellStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(11, 18, 35, 0.42), rgba(11, 18, 35, 0.55)), url(${adminConsoleBg})`
}

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  const titles = {
    '/admin/dashboard': '数据统计',
    '/admin/users': '用户管理',
    '/admin/merchants': '商家管理',
    '/admin/snacks': '小吃摊管理',
    '/admin/supermarket': '超市管理',
    '/admin/tutors': '家教管理',
    '/admin/secondhand': '二手交易管理',
    '/admin/study-materials': '学习资料管理',
    '/admin/forum': '论坛管理',
    '/admin/orders': '订单管理',
    '/admin/driving-schools': '驾校管理'
  }

  return titles[route.path] || '后台管理'
})

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      profileDialogVisible.value = true
      break
    case 'home':
      router.push('/')
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
.admin-shell {
  min-height: 100vh;
  padding: 20px;
  position: relative;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.admin-shell__glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(90px);
  z-index: 0;
  pointer-events: none;
}

.admin-shell__glow--one {
  top: 120px;
  left: -70px;
  width: 280px;
  height: 280px;
  background: rgba(79, 124, 255, 0.14);
}

.admin-shell__glow--two {
  right: 0;
  bottom: 60px;
  width: 320px;
  height: 320px;
  background: rgba(0, 194, 168, 0.12);
}

.admin-layout {
  min-height: calc(100vh - 40px);
  gap: 20px;
  position: relative;
  z-index: 1;
}

.admin-aside {
  padding: 18px;
  border-radius: var(--app-radius-xl);
  background: rgba(18, 27, 53, 0.86);
  color: #fff;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  padding: 8px 4px;
}

.admin-brand__icon {
  width: 50px;
  height: 50px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #4f7cff, #7b61ff);
  color: #fff;
  font-weight: 900;
  font-size: 22px;
}

.admin-brand strong {
  display: block;
  font-size: 18px;
}

.admin-brand span {
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
}

.admin-aside__summary {
  padding: 18px;
  border-radius: 22px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.aside-badge {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(79, 124, 255, 0.16);
  color: #9db6ff;
  font-size: 12px;
}

.admin-aside__summary h3 {
  margin: 14px 0 10px;
  font-size: 20px;
  line-height: 1.4;
}

.admin-aside__summary p {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.7;
}

.admin-menu {
  border: none;
  background: transparent;
}

.admin-menu :deep(.el-menu-item) {
  height: 48px;
  margin-bottom: 8px;
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.72);
}

.admin-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.admin-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.24), rgba(123, 97, 255, 0.26));
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.admin-main-layout {
  gap: 20px;
}

.admin-header {
  height: auto;
  padding: 22px 24px;
  border-radius: var(--app-radius-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.admin-header__copy h1 {
  margin: 14px 0 10px;
  font-size: 32px;
  color: #162441;
}

.admin-header__copy p {
  margin: 0;
  color: var(--app-text-soft);
}

.admin-header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
}

.admin-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
}

.admin-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  cursor: pointer;
}

.admin-user__avatar {
  background: linear-gradient(135deg, #4f7cff, #7b61ff);
  color: #fff;
  font-weight: 800;
}

.admin-user__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-user__copy span {
  font-size: 12px;
  color: var(--app-text-soft);
}

.admin-main {
  padding: 0;
  background: transparent;
}

@media (max-width: 960px) {
  .admin-layout {
    display: block;
  }

  .admin-aside {
    width: 100% !important;
    margin-bottom: 16px;
  }

  .admin-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-header__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

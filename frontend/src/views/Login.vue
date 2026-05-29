<template>
  <div class="login-page" :style="loginPageStyle">
    <div class="login-page__aurora login-page__aurora--one"></div>
    <div class="login-page__aurora login-page__aurora--two"></div>
    <div class="login-page__grid"></div>

    <div class="login-layout">
      <section class="login-showcase">
        <div class="login-badge">CHD Campus Portal</div>
        <h1>长安大学校园服务平台</h1>
        <p class="login-subtitle">
          连接校园生活服务、学习资料与社区互动，打造更统一、更现代的校园数字入口。
        </p>

        <div class="login-highlights">
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">🏫</div>
            <div>
              <strong>校园一体化</strong>
              <span>生活服务、论坛交流、学习资料集中管理</span>
            </div>
          </div>
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">✨</div>
            <div>
              <strong>更轻盈的体验</strong>
              <span>全新视觉背景、柔和动效与更聚焦的登录界面</span>
            </div>
          </div>
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">🔐</div>
            <div>
              <strong>安全校园入口</strong>
              <span>仅限校内学生与管理员账号访问系统核心功能</span>
            </div>
          </div>
        </div>
      </section>

      <section class="login-panel glass-card">
        <div class="login-panel__top">
          <div class="login-panel__logo">长</div>
          <div>
            <h2>欢迎登录</h2>
            <p>请输入学号与密码进入校园服务平台</p>
          </div>
        </div>

        <div class="login-panel__notice">
          <el-icon><InfoFilled /></el-icon>
          <span>仅限本校在校学生登录，请使用学号与密码</span>
        </div>

        <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form">
          <el-form-item prop="studentId">
            <el-input
              v-model="loginForm.studentId"
              placeholder="请输入学号"
              size="large"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" size="large" :loading="loading" @click="handleLogin" class="login-submit">
              登录平台
            </el-button>
          </el-form-item>

          <el-button plain size="large" class="guest-submit" :disabled="guestDisabled" @click="enterAsGuest">
            {{ guestDisabled ? '访客浏览已关闭' : '游客浏览公开信息' }}
          </el-button>

          <div class="login-footer">
            <span>还没有账号？</span>
            <router-link to="/register">立即注册</router-link>
            <router-link to="/merchant-login">商家登录</router-link>
            <router-link to="/merchant-register">商家入驻</router-link>
          </div>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User, InfoFilled } from '@element-plus/icons-vue'
import { authApi, publicApi } from '@/api'
import { useUserStore } from '@/stores/user'
import campusLoginBg from '@/assets/bg-campus-login.svg'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)
const guestDisabled = ref(false)
const loginPageStyle = {
  backgroundImage: `linear-gradient(135deg, rgba(14, 22, 48, 0.78), rgba(28, 37, 96, 0.64), rgba(53, 36, 104, 0.68)), url(${campusLoginBg})`
}

const loginForm = reactive({
  studentId: '',
  password: ''
})

const loginRules = {
  studentId: [
    { required: true, message: '请输入学号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

onMounted(() => {
  userStore.logout()
  loadGuestAccess()
})

const loadGuestAccess = async () => {
  try {
    const res = await publicApi.getGuestAccess()
    guestDisabled.value = res.data?.guestAccessEnabled === false
  } catch (error) {
    console.error('读取访客设置失败:', error)
  }
}

const enterAsGuest = () => {
  if (guestDisabled.value) {
    ElMessage.warning('总管理员已关闭访客浏览功能')
    return
  }
  router.push('/snack')
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await authApi.login(loginForm)
        userStore.setToken(res.data.token)
        userStore.setUser(res.data.user)
        ElMessage.success('登录成功')
        const role = res.data.user?.role
        router.push(role === 'admin' ? '/admin/dashboard' : role === 'merchant' ? '/merchant/dashboard' : '/')
      } catch (error) {
        console.error('登录失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.login-page__aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.85;
}

.login-page__aurora--one {
  width: 340px;
  height: 340px;
  top: 10%;
  left: 8%;
  background: rgba(86, 178, 255, 0.26);
  animation: floatGlow 14s ease-in-out infinite;
}

.login-page__aurora--two {
  width: 420px;
  height: 420px;
  right: 6%;
  bottom: 4%;
  background: rgba(151, 103, 255, 0.26);
  animation: floatGlow 18s ease-in-out infinite reverse;
}

.login-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), transparent 90%);
  opacity: 0.35;
}

.login-layout {
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 32px;
  align-items: center;
}

.login-showcase {
  color: #fff;
  padding: 24px 12px 24px 8px;
  animation: fadeUp 0.8s ease;
}

.login-badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  backdrop-filter: blur(18px);
}

.login-showcase h1 {
  margin: 22px 0 16px;
  font-size: 54px;
  line-height: 1.1;
  font-weight: 900;
}

.login-subtitle {
  max-width: 640px;
  margin: 0;
  font-size: 18px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.78);
}

.login-highlights {
  display: grid;
  gap: 16px;
  margin-top: 32px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.highlight-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-radius: 22px;
  color: #fff;
}

.highlight-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  font-size: 24px;
}

.highlight-card strong {
  display: block;
  margin-bottom: 6px;
  font-size: 16px;
}

.highlight-card span {
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.7;
  font-size: 14px;
}

.login-panel {
  padding: 34px 34px 30px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(255, 255, 255, 0.38);
  animation: floatCard 5.4s ease-in-out infinite;
}

.login-panel__top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.login-panel__logo {
  width: 64px;
  height: 64px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #4f7cff, #7b61ff);
  box-shadow: 0 16px 36px rgba(79, 124, 255, 0.32);
}

.login-panel__top h2 {
  margin: 0 0 6px;
  font-size: 34px;
  color: #1e2b4a;
}

.login-panel__top p {
  margin: 0;
  color: #70809f;
}

.login-panel__notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(79, 124, 255, 0.08);
  color: #51627f;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 54px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.12) inset;
}

.login-submit {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.guest-submit {
  width: 100%;
  min-height: 48px;
  border-radius: 18px;
  font-weight: 700;
}

.login-footer {
  text-align: center;
  margin-top: 14px;
  color: #5f6f8e;
}

.login-footer a {
  color: #4f7cff;
  text-decoration: none;
  margin-left: 6px;
  font-weight: 700;
}

.login-footer a:hover {
  text-decoration: underline;
}

@keyframes floatGlow {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(12px, 28px, 0) scale(1.08);
  }
}

@keyframes floatCard {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .login-layout {
    grid-template-columns: 1fr;
    width: min(720px, calc(100vw - 36px));
  }

  .login-showcase {
    padding-bottom: 0;
  }

  .login-showcase h1 {
    font-size: 42px;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 18px;
  }

  .login-layout {
    width: 100%;
    gap: 18px;
  }

  .login-showcase h1 {
    font-size: 34px;
  }

  .login-subtitle {
    font-size: 15px;
  }

  .login-panel {
    padding: 24px 20px 22px;
    border-radius: 24px;
  }

  .login-panel__top {
    align-items: flex-start;
  }

  .login-panel__top h2 {
    font-size: 28px;
  }
}
</style>

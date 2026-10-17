<template>
  <div class="login-page" :style="loginPageStyle">
    <div class="login-page__aurora login-page__aurora--one"></div>
    <div class="login-page__aurora login-page__aurora--two"></div>
    <div class="login-page__grid"></div>

    <div class="login-layout">
      <section class="login-showcase" aria-labelledby="login-showcase-title">
        <div class="login-badge">CHD Campus Portal</div>
        <h1 id="login-showcase-title">长安大学校园服务平台</h1>
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

      <section class="login-panel glass-card" aria-labelledby="login-title">
        <div class="login-panel__top">
          <div class="login-panel__logo">长</div>
          <div>
            <h2 id="login-title">欢迎登录</h2>
            <p>请输入学号与密码进入校园服务平台</p>
          </div>
        </div>

        <div class="login-panel__notice" role="note">
          <el-icon><InfoFilled /></el-icon>
          <span>仅限本校在校学生登录，请使用学号与密码</span>
        </div>

        <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form" label-position="top" @submit.prevent="handleLogin">
          <el-form-item label="学号" prop="studentId" class="login-form__item">
            <el-input
              v-model="loginForm.studentId"
              placeholder="请输入 10 位学号"
              autocomplete="username"
              name="username"
              inputmode="numeric"
              maxlength="10"
              size="large"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="登录密码" prop="password" class="login-form__item">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              name="password"
              maxlength="128"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="login-form__submit-item">
            <el-button type="primary" native-type="submit" size="large" :loading="loading" class="login-submit">
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
  backgroundImage: `linear-gradient(135deg, rgba(9, 18, 43, 0.92), rgba(20, 34, 86, 0.88), rgba(46, 30, 96, 0.84)), url("${campusLoginBg}")`
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
  if (!loginFormRef.value || loading.value) return

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await authApi.login({ ...loginForm })
    userStore.setToken(res.data.token)
    userStore.setUser(res.data.user)
    ElMessage.success('登录成功')
    const role = res.data.user?.role
    await router.push(role === 'admin' ? '/admin/dashboard' : role === 'merchant' ? '/merchant/dashboard' : '/')
  } catch (error) {
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
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
  padding: clamp(24px, 5vh, 64px) 24px;
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
  width: min(1280px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
  gap: clamp(32px, 5vw, 76px);
  align-items: center;
}

.login-showcase {
  color: #ffffff;
  padding: 24px 12px 24px 8px;
  animation: fadeUp 0.8s ease;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.login-badge {
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 999px;
  color: #f8fbff;
  background: rgba(5, 14, 36, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  backdrop-filter: blur(18px);
}

.login-showcase h1 {
  margin: 22px 0 16px;
  max-width: 720px;
  color: #ffffff;
  font-size: clamp(40px, 4vw, 60px);
  line-height: 1.1;
  font-weight: 900;
  text-shadow: 0 1px 2px rgba(2, 8, 24, 0.58);
}

.login-subtitle {
  max-width: 640px;
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.75;
  color: #ffffff;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px rgba(2, 8, 24, 0.48);
}

.login-highlights {
  display: grid;
  gap: 16px;
  margin-top: 32px;
}

.glass-card {
  background: rgba(5, 14, 36, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.24);
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
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.highlight-card:hover {
  transform: translateY(-2px);
  background: rgba(20, 37, 76, 0.82);
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
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(2, 8, 24, 0.52);
}

.highlight-card span {
  color: #f5f8ff;
  font-weight: 600;
  line-height: 1.7;
  font-size: 15px;
  text-shadow: 0 1px 2px rgba(2, 8, 24, 0.48);
}

.login-panel {
  padding: clamp(28px, 3vw, 42px);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(255, 255, 255, 0.72);
  animation: fadeUp 0.65s ease both;
  box-shadow: 0 32px 88px rgba(19, 35, 82, 0.2);
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
  color: #53627d;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
}

.login-panel__notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(79, 124, 255, 0.1);
  color: #34425e;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.55;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 6px;
  color: #2f3c56;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.login-form :deep(.login-form__submit-item) {
  margin-bottom: 12px;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 54px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.12) inset;
  transition: box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.32) inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(79, 124, 255, 0.28) inset, 0 0 0 4px rgba(79, 124, 255, 0.08);
}

.login-form :deep(.el-input__inner) {
  color: #1f2c47;
  font-size: 15px;
  font-weight: 500;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #667085;
  opacity: 1;
  font-weight: 500;
}

.login-form :deep(.el-input__prefix-inner),
.login-form :deep(.el-input__suffix-inner) {
  color: #5d6b84;
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
  color: #26344e;
  border-color: rgba(49, 95, 232, 0.3);
  font-weight: 700;
}

.login-footer {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  column-gap: 14px;
  row-gap: 8px;
  margin-top: 18px;
  color: #4c5a73;
  font-size: 14px;
  font-weight: 500;
}

.login-footer a {
  color: #315fe8;
  text-decoration: none;
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
    grid-template-columns: minmax(0, 0.9fr) minmax(390px, 1.1fr);
    gap: 28px;
  }

  .login-showcase {
    padding: 16px 0;
  }

  .login-showcase h1 {
    font-size: 40px;
  }

  .highlight-card {
    padding: 14px 16px;
  }
}

@media (max-width: 820px) {
  .login-page {
    align-items: flex-start;
    min-height: 100vh;
    padding: 28px 20px;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .login-layout {
    width: min(560px, 100%);
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }

  .login-showcase {
    padding: 0;
    text-align: center;
  }

  .login-showcase h1 {
    margin: 14px 0 8px;
    font-size: clamp(28px, 6vw, 38px);
  }

  .login-subtitle {
    max-width: 520px;
    margin: 0 auto;
    font-size: 15px;
    line-height: 1.7;
  }

  .login-highlights {
    display: none;
  }
}

@media (max-height: 760px) and (min-width: 821px) {
  .login-page {
    align-items: flex-start;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .login-layout {
    margin-block: auto;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 24px 14px;
  }

  .login-layout {
    width: 100%;
    gap: 18px;
  }

  .login-badge {
    padding: 8px 12px;
    font-size: 11px;
  }

  .login-subtitle {
    max-width: 380px;
    font-size: 15px;
  }

  .login-panel {
    padding: 24px 20px 20px;
    border-radius: 24px;
  }

  .login-panel__logo {
    width: 52px;
    height: 52px;
    flex: 0 0 52px;
    border-radius: 17px;
    font-size: 24px;
  }

  .login-panel__top h2 {
    font-size: 26px;
  }

  .login-panel__notice {
    align-items: flex-start;
    padding: 11px 12px;
    font-size: 13px;
    line-height: 1.55;
  }

  .login-form :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  .login-footer {
    column-gap: 12px;
    font-size: 13px;
  }
}

@media (max-width: 380px) {
  .login-page {
    padding: 18px 10px;
  }

  .login-panel {
    padding: 20px 16px 18px;
  }

  .login-panel__top {
    gap: 12px;
  }

  .login-panel__top p {
    font-size: 14px;
  }

  .login-footer {
    column-gap: 10px;
  }
}
</style>

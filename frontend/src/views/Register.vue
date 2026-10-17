<template>
  <div class="register-page" :style="registerPageStyle">
    <div class="register-page__aurora register-page__aurora--one"></div>
    <div class="register-page__aurora register-page__aurora--two"></div>
    <div class="register-page__grid"></div>

    <div class="register-layout">
      <section class="register-showcase">
        <div class="register-badge">CHD Student Onboarding</div>
        <h1>加入长大 e 家</h1>
        <p class="register-subtitle">
          绑定长安大学官方教育邮箱，开启一站式校园生活、二手置换、家教学习与交流社区。
        </p>

        <div class="register-highlights">
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">🎓</div>
            <div>
              <strong>实名认证与安全规范</strong>
              <span>仅限长安大学在校学生注册，学号与官方教育邮箱严格核验</span>
            </div>
          </div>
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">📦</div>
            <div>
              <strong>专属校园服务</strong>
              <span>东门小吃、校园超市、二手交易、学习资料与拼车驾校</span>
            </div>
          </div>
          <div class="highlight-card glass-card">
            <div class="highlight-card__icon">💬</div>
            <div>
              <strong>校园互动社区</strong>
              <span>参与校园论坛讨论，发布需求与分享校园新鲜事</span>
            </div>
          </div>
        </div>
      </section>

      <section class="register-panel glass-card">
        <div class="register-panel__top">
          <div class="register-panel__logo">长</div>
          <div>
            <h2>新用户注册</h2>
            <p>请填写学号与校内邮箱完成账号注册</p>
          </div>
        </div>

        <div class="register-panel__notice">
          <el-icon><InfoFilled /></el-icon>
          <span>需绑定长安大学教育邮箱（@chd.edu.cn）验证身份</span>
        </div>

        <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" class="register-form">
          <el-form-item prop="studentId">
            <el-input v-model="registerForm.studentId" placeholder="请输入学号（10位数字）" size="large">
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="email">
            <el-input v-model="registerForm.email" placeholder="教育邮箱（@chd.edu.cn）" size="large">
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code">
            <div class="code-input-row">
              <el-input v-model="registerForm.code" placeholder="请输入验证码" size="large">
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
              <el-button
                class="code-send-btn"
                :disabled="sending || countdown > 0"
                :loading="sending"
                @click="sendVerificationCode"
                size="large"
              >
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <div class="form-row">
            <el-form-item prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码（至少6位）"
                size="large"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="确认密码"
                size="large"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </div>

          <div class="form-row">
            <el-form-item prop="name">
              <el-input v-model="registerForm.name" placeholder="请输入姓名" size="large">
                <template #prefix>
                  <el-icon><UserFilled /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="grade">
              <el-select v-model="registerForm.grade" placeholder="请选择年级" size="large" style="width: 100%">
                <el-option label="大一" value="大一" />
                <el-option label="大二" value="大二" />
                <el-option label="大三" value="大三" />
                <el-option label="大四" value="大四" />
                <el-option label="研一" value="研一" />
                <el-option label="研二" value="研二" />
                <el-option label="研三" value="研三" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item prop="major">
            <el-input v-model="registerForm.major" placeholder="请输入院系与专业" size="large">
              <template #prefix>
                <el-icon><Reading /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" size="large" :loading="loading" @click="handleRegister" class="register-submit">
              立即注册
            </el-button>
          </el-form-item>

          <div class="register-footer">
            <span>已有账号？</span>
            <router-link to="/login">返回登录</router-link>
            <span class="divider">|</span>
            <router-link to="/merchant-register">商家入驻</router-link>
          </div>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Message, Key, Lock, UserFilled, Reading, InfoFilled } from '@element-plus/icons-vue'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'
import campusLoginBg from '@/assets/bg-campus-login.svg'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref(null)
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer = null

const registerPageStyle = {
  backgroundImage: `linear-gradient(135deg, rgba(14, 22, 48, 0.78), rgba(28, 37, 96, 0.64), rgba(53, 36, 104, 0.68)), url("${campusLoginBg}")`
}

const registerForm = reactive({
  studentId: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  name: '',
  major: '',
  grade: ''
})

const validateStudentId = (rule, value, callback) => {
  const pattern = /^\d{10}$/
  if (!pattern.test(value)) {
    callback(new Error('学号格式不正确，应为10位数字'))
  } else {
    callback()
  }
}

const validateEmail = (rule, value, callback) => {
  const pattern = /^[a-zA-Z0-9._%+-]+@chd\.edu\.cn$/
  if (!pattern.test(value)) {
    callback(new Error('邮箱必须为长安大学教育邮箱（@chd.edu.cn）'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const registerRules = {
  studentId: [
    { required: true, message: '请输入学号', trigger: 'blur' },
    { validator: validateStudentId, trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { validator: validateEmail, trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  major: [
    { required: true, message: '请输入专业', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请选择年级', trigger: 'change' }
  ]
}

const sendVerificationCode = async () => {
  if (!registerForm.studentId) {
    ElMessage.warning('请先输入学号')
    return
  }
  if (!registerForm.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }

  sending.value = true
  try {
    await authApi.sendVerification({
      studentId: registerForm.studentId,
      email: registerForm.email
    })
    ElMessage.success('验证码已发送到您的邮箱')
    countdown.value = 60
    if (timer) {
      clearInterval(timer)
    }
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
  } finally {
    sending.value = false
  }
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await authApi.register({
          studentId: registerForm.studentId,
          email: registerForm.email,
          code: registerForm.code,
          password: registerForm.password,
          name: registerForm.name,
          major: registerForm.major,
          grade: registerForm.grade
        })
        userStore.setToken(res.data.token)
        userStore.setUser(res.data.user)
        ElMessage.success('注册成功')
        router.push('/')
      } catch (error) {
        console.error('注册失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.register-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: hidden;
}

.register-page__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.9), transparent 82%);
}

.register-page__aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.65;
  pointer-events: none;
}

.register-page__aurora--one {
  top: 8%;
  left: 6%;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(79, 124, 255, 0.42), transparent 70%);
}

.register-page__aurora--two {
  bottom: 8%;
  right: 8%;
  width: 440px;
  height: 440px;
  background: radial-gradient(circle, rgba(0, 194, 168, 0.32), rgba(123, 97, 255, 0.35) 60%, transparent 75%);
}

.register-layout {
  position: relative;
  z-index: 1;
  width: min(1180px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 36px;
  align-items: center;
}

.register-showcase {
  color: #fff;
  padding: 24px 12px 24px 8px;
  animation: fadeUp 0.8s ease;
}

.register-badge {
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

.register-showcase h1 {
  margin: 22px 0 16px;
  font-size: 52px;
  line-height: 1.15;
  font-weight: 900;
}

.register-subtitle {
  max-width: 600px;
  margin: 0;
  font-size: 17px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.8);
}

.register-highlights {
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
  flex-shrink: 0;
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

.register-panel {
  padding: 36px 36px 32px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 30px 90px rgba(10, 16, 32, 0.22);
}

.register-panel__top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.register-panel__logo {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  background: linear-gradient(135deg, #4f7cff, #7b61ff);
  box-shadow: 0 12px 24px rgba(79, 124, 255, 0.32);
}

.register-panel__top h2 {
  margin: 0;
  font-size: 24px;
  color: #121c35;
  font-weight: 800;
}

.register-panel__top p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.register-panel__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(79, 124, 255, 0.08);
  color: #3b5bdb;
  font-size: 13px;
  margin-bottom: 20px;
}

.register-form {
  margin-top: 10px;
}

.code-input-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-send-btn {
  min-width: 110px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.register-submit {
  width: 100%;
  font-weight: 700;
}

.register-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 14px;
  color: #64748b;
}

.register-footer a {
  color: #4f7cff;
  font-weight: 600;
  text-decoration: none;
}

.register-footer a:hover {
  text-decoration: underline;
}

.register-footer .divider {
  color: #cbd5e1;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .register-layout {
    grid-template-columns: 1fr;
    max-width: 580px;
  }

  .register-showcase {
    text-align: center;
    padding: 0 0 12px;
  }

  .register-subtitle {
    margin: 0 auto;
  }

  .register-highlights {
    display: none;
  }

  .register-showcase h1 {
    font-size: 40px;
  }
}

@media (max-width: 640px) {
  .register-page {
    padding: 16px 12px;
  }

  .register-panel {
    padding: 24px 18px;
    border-radius: 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .register-showcase h1 {
    font-size: 28px;
    margin: 14px 0 8px;
  }

  .register-subtitle {
    font-size: 14px;
  }

  .code-send-btn {
    min-width: 95px;
    padding: 0 10px;
    font-size: 13px;
  }
}
</style>

<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h1>长安大学校园服务平台</h1>
        <p>欢迎注册</p>
        <p class="register-notice">仅限本校在校学生注册，需使用学号并绑定学校教育邮箱（@chd.edu.cn）</p>
      </div>
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" class="register-form">
        <el-form-item prop="studentId">
          <el-input v-model="registerForm.studentId" placeholder="请输入学号（10位数字）" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入长安大学教育邮箱（@chd.edu.cn）" prefix-icon="Message" size="large" />
        </el-form-item>
        <el-form-item prop="code">
          <div style="display: flex; gap: 10px; width: 100%">
            <el-input v-model="registerForm.code" placeholder="请输入验证码" prefix-icon="Key" size="large" />
            <el-button :disabled="sending || countdown > 0" :loading="sending" @click="sendVerificationCode" size="large">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item prop="name">
          <el-input v-model="registerForm.name" placeholder="请输入姓名" prefix-icon="UserFilled" size="large" />
        </el-form-item>
        <el-form-item prop="major">
          <el-input v-model="registerForm.major" placeholder="请输入专业" prefix-icon="Reading" size="large" />
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
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" @click="handleRegister" style="width: 100%">注册</el-button>
        </el-form-item>
        <div class="register-footer">
          <span>已有账号？</span>
          <router-link to="/login">立即登录</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const registerFormRef = ref(null)
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)

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
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
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
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 0;
}

.register-box {
  width: 480px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.register-header p {
  font-size: 16px;
  color: #666;
}

.register-notice {
  font-size: 13px !important;
  color: #999 !important;
  margin-top: 8px;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

.register-form {
  margin-top: 30px;
}

.register-footer {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.register-footer a {
  color: #667eea;
  text-decoration: none;
  margin-left: 5px;
}

.register-footer a:hover {
  text-decoration: underline;
}
</style>

<template>
  <div class="merchant-register-page">
    <section class="merchant-register-panel">
      <div class="merchant-register-header">
        <h1>商家入驻申请</h1>
        <p>提交店铺基础信息后，由总管理员审核开通商家后台权限</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="联系人姓名" prop="name">
            <el-input v-model="form.name" size="large" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="form.phone" size="large" placeholder="请输入联系电话" />
          </el-form-item>
        </div>

        <el-form-item label="店铺名称" prop="storeName">
          <el-input v-model="form.storeName" size="large" placeholder="请输入店铺名称" />
        </el-form-item>

        <el-form-item label="店铺地址" prop="address">
          <el-input v-model="form.address" size="large" placeholder="请输入店铺地址" />
        </el-form-item>

        <el-form-item label="普通邮箱" prop="email">
          <el-input v-model="form.email" size="large" placeholder="请输入常用邮箱">
            <template #append>
              <el-button :loading="sending" :disabled="countdown > 0" @click="sendCode">
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <div class="form-grid">
          <el-form-item label="邮箱验证码" prop="code">
            <el-input v-model="form.code" size="large" placeholder="请输入验证码" />
          </el-form-item>
          <el-form-item label="登录密码" prop="password">
            <el-input v-model="form.password" type="password" size="large" placeholder="至少6位" show-password />
          </el-form-item>
        </div>

        <el-form-item label="店铺简介">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="可填写经营范围、服务说明等" />
        </el-form-item>

        <el-button class="submit-button" type="primary" size="large" :loading="submitting" @click="submit">
          提交入驻申请
        </el-button>

        <div class="merchant-register-footer">
          <router-link to="/merchant-login">已有商家账号，去登录</router-link>
          <router-link to="/login">返回普通登录</router-link>
        </div>
      </el-form>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'

const router = useRouter()
const formRef = ref(null)
const sending = ref(false)
const submitting = ref(false)
const countdown = ref(0)

const form = reactive({
  name: '',
  phone: '',
  storeName: '',
  address: '',
  email: '',
  code: '',
  password: '',
  description: ''
})

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const validateEmail = (rule, value, callback) => {
  if (!emailPattern.test(value)) {
    callback(new Error('请输入有效邮箱'))
  } else {
    callback()
  }
}

const rules = {
  name: [{ required: true, message: '请输入联系人姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  storeName: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
  address: [{ required: true, message: '请输入店铺地址', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { validator: validateEmail, trigger: 'blur' }
  ],
  code: [{ required: true, message: '请输入邮箱验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const startCountdown = () => {
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const sendCode = async () => {
  if (!emailPattern.test(form.email)) {
    ElMessage.warning('请先填写有效邮箱')
    return
  }

  sending.value = true
  try {
    const result = await authApi.sendMerchantVerification({ email: form.email })
    const debugCode = result?.data?.debugCode
    ElMessage.success(debugCode ? `验证码已发送，开发环境验证码：${debugCode}` : '验证码已发送')
    startCountdown()
  } finally {
    sending.value = false
  }
}

const submit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await authApi.merchantRegister(form)
      ElMessage.success('入驻申请已提交，请等待总管理员审核')
      router.push('/login')
    } finally {
      submitting.value = false
    }
  })
}
</script>

<style scoped>
.merchant-register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(26, 42, 92, 0.72), rgba(42, 94, 116, 0.62)),
    url('@/assets/bg-campus-login.svg') center/cover no-repeat;
}

.merchant-register-panel {
  width: min(760px, 100%);
  padding: 34px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
}

.merchant-register-header {
  margin-bottom: 24px;
  text-align: center;
}

.merchant-register-header h1 {
  margin: 0 0 10px;
  font-size: 30px;
  color: #13213f;
}

.merchant-register-header p {
  margin: 0;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.submit-button {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
}

.merchant-register-footer {
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.merchant-register-footer a {
  color: #4f7cff;
  text-decoration: none;
  font-weight: 700;
}

@media (max-width: 720px) {
  .merchant-register-panel {
    padding: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>

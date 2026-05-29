<template>
  <div class="merchant-login-page" :style="pageStyle">
    <div class="merchant-login-page__grid"></div>

    <main class="merchant-login-layout">
      <section class="merchant-login-copy">
        <div class="merchant-login-badge">Merchant Console</div>
        <h1>商家登录</h1>
        <p>商家账号审核通过后，可在这里进入独立后台，管理自有商品、订单和售后申请。</p>

        <div class="merchant-login-points">
          <div>
            <strong>独立商家后台</strong>
            <span>只展示当前店铺的数据与订单</span>
          </div>
          <div>
            <strong>商品与订单管理</strong>
            <span>发布自有商品，处理客户订单详情</span>
          </div>
          <div>
            <strong>售后协同处理</strong>
            <span>查看并处理退款退货申请</span>
          </div>
        </div>
      </section>

      <section class="merchant-login-card">
        <div class="merchant-login-card__top">
          <div class="merchant-login-card__logo">M</div>
          <div>
            <h2>进入商家后台</h2>
            <p>请使用入驻申请邮箱和密码登录</p>
          </div>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" class="merchant-login-form">
          <el-form-item prop="studentId">
            <el-input v-model="form.studentId" size="large" placeholder="请输入商家邮箱">
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" size="large" placeholder="请输入密码" show-password>
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-button class="merchant-login-submit" type="primary" size="large" :loading="loading" @click="handleLogin">
            登录商家后台
          </el-button>

          <div class="merchant-login-footer">
            <router-link to="/merchant-register">申请商家入驻</router-link>
            <router-link to="/login">返回普通登录</router-link>
          </div>
        </el-form>
      </section>
    </main>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, Message } from '@element-plus/icons-vue'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'
import campusLoginBg from '@/assets/bg-campus-login.svg'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const pageStyle = {
  backgroundImage: `linear-gradient(135deg, rgba(12, 30, 48, 0.82), rgba(33, 73, 88, 0.68)), url(${campusLoginBg})`
}

const form = reactive({
  studentId: '',
  password: ''
})

const rules = {
  studentId: [
    { required: true, message: '请输入商家邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

onMounted(() => {
  userStore.logout()
})

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      const res = await authApi.login(form)
      const user = res.data.user

      if (user?.role !== 'merchant') {
        userStore.logout()
        ElMessage.warning('此入口仅限商家账号登录')
        return
      }

      userStore.setToken(res.data.token)
      userStore.setUser(user)
      ElMessage.success('商家登录成功')
      router.push('/merchant/dashboard')
    } catch (error) {
      console.error('商家登录失败:', error)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.merchant-login-page {
  min-height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 28px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
}

.merchant-login-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 34px 34px;
  opacity: 0.32;
}

.merchant-login-layout {
  position: relative;
  z-index: 1;
  width: min(1080px, 100%);
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 34px;
  align-items: center;
}

.merchant-login-copy {
  color: #fff;
}

.merchant-login-badge {
  display: inline-flex;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 13px;
  font-weight: 700;
}

.merchant-login-copy h1 {
  margin: 22px 0 14px;
  font-size: 52px;
  line-height: 1.08;
}

.merchant-login-copy p {
  max-width: 590px;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.9;
  font-size: 18px;
}

.merchant-login-points {
  display: grid;
  gap: 14px;
  margin-top: 30px;
}

.merchant-login-points div {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(18px);
}

.merchant-login-points strong {
  display: block;
  margin-bottom: 6px;
}

.merchant-login-points span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.merchant-login-card {
  padding: 34px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
}

.merchant-login-card__top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.merchant-login-card__logo {
  width: 62px;
  height: 62px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  box-shadow: 0 16px 34px rgba(15, 118, 110, 0.26);
}

.merchant-login-card__top h2 {
  margin: 0 0 6px;
  color: #13213f;
  font-size: 30px;
}

.merchant-login-card__top p {
  margin: 0;
  color: #64748b;
}

.merchant-login-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.merchant-login-form :deep(.el-input__wrapper) {
  min-height: 54px;
  border-radius: 18px;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12) inset;
}

.merchant-login-submit {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  font-weight: 700;
}

.merchant-login-footer {
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.merchant-login-footer a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 700;
}

.merchant-login-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .merchant-login-layout {
    grid-template-columns: 1fr;
    width: min(680px, 100%);
  }

  .merchant-login-copy h1 {
    font-size: 40px;
  }
}

@media (max-width: 560px) {
  .merchant-login-page {
    padding: 18px;
  }

  .merchant-login-card {
    padding: 24px 20px;
  }

  .merchant-login-card__top {
    align-items: flex-start;
  }

  .merchant-login-copy h1 {
    font-size: 34px;
  }
}
</style>

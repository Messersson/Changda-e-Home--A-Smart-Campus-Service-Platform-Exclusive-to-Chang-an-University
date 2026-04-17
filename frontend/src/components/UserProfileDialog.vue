<template>
  <el-dialog
    :model-value="modelValue"
    class="profile-dialog"
    width="min(980px, calc(100vw - 24px))"
    top="5vh"
    destroy-on-close
    @close="handleClose"
  >
    <template #header>
      <div class="profile-dialog__header">
        <div>
          <div class="profile-dialog__eyebrow">Profile Center</div>
          <h2>个人信息</h2>
          <p>查看账号资料、维护基础信息，并单独管理账户密码。</p>
        </div>
        <div class="profile-dialog__role">{{ roleLabel }}</div>
      </div>
    </template>

    <div v-loading="loadingProfile" class="profile-layout">
      <aside class="profile-summary">
        <div class="profile-summary__hero">
          <el-avatar :size="72" class="profile-summary__avatar">
            {{ displayName.slice(0, 1) }}
          </el-avatar>
          <div>
            <strong>{{ displayName }}</strong>
            <p>{{ roleLabel }} · {{ statusLabel }}</p>
          </div>
        </div>

        <div class="profile-progress">
          <div class="profile-progress__row">
            <span>资料完整度</span>
            <strong>{{ profileCompletion }}%</strong>
          </div>
          <el-progress :percentage="profileCompletion" :stroke-width="10" :show-text="false" />
        </div>

        <div class="profile-meta">
          <div class="profile-meta__item">
            <span>学号</span>
            <strong>{{ currentProfile?.studentId || '未获取' }}</strong>
          </div>
          <div class="profile-meta__item">
            <span>邮箱</span>
            <strong>{{ currentProfile?.email || '未获取' }}</strong>
          </div>
          <div class="profile-meta__item">
            <span>注册时间</span>
            <strong>{{ createdAtLabel }}</strong>
          </div>
        </div>

        <div class="profile-summary__tips">
          <span>资料维护建议</span>
          <p>姓名、专业和年级会同步更新到当前登录状态，修改后导航栏也会立即刷新。</p>
        </div>
      </aside>

      <section class="profile-content">
        <div class="profile-card">
          <div class="profile-card__header">
            <div>
              <h3>基础资料</h3>
              <p>学号和邮箱作为账号标识保留只读，支持维护姓名、专业和年级。</p>
            </div>
            <el-tag effect="plain" type="info">账号资料</el-tag>
          </div>

          <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top" class="profile-form">
            <div class="profile-form__grid">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="profileForm.name" maxlength="50" placeholder="请输入姓名" />
              </el-form-item>

              <el-form-item label="专业" prop="major">
                <el-input v-model="profileForm.major" maxlength="100" placeholder="请输入专业" />
              </el-form-item>

              <el-form-item label="年级" prop="grade">
                <el-input v-model="profileForm.grade" maxlength="20" placeholder="例如 2023 级" />
              </el-form-item>

              <el-form-item label="学号">
                <el-input :model-value="currentProfile?.studentId || ''" disabled />
              </el-form-item>

              <el-form-item label="邮箱">
                <el-input :model-value="currentProfile?.email || ''" disabled />
              </el-form-item>

              <el-form-item label="账号状态">
                <el-input :model-value="statusLabel" disabled />
              </el-form-item>
            </div>

            <div class="profile-actions">
              <el-button @click="reloadProfile" :loading="loadingProfile">刷新资料</el-button>
              <el-button type="primary" :disabled="!isProfileDirty" :loading="savingProfile" @click="saveProfile">
                保存修改
              </el-button>
            </div>
          </el-form>
        </div>

        <div class="profile-card">
          <div class="profile-card__header">
            <div>
              <h3>账户安全</h3>
              <p>为避免误操作，密码修改和资料修改分开保存。</p>
            </div>
            <el-tag effect="plain" type="warning">安全设置</el-tag>
          </div>

          <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top" class="profile-form">
            <div class="profile-form__grid">
              <el-form-item label="当前密码" prop="currentPassword">
                <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  show-password
                  placeholder="请输入当前密码"
                />
              </el-form-item>

              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password
                  placeholder="请输入不少于 6 位的新密码"
                />
              </el-form-item>

              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  show-password
                  placeholder="请再次输入新密码"
                />
              </el-form-item>
            </div>

            <div class="profile-actions">
              <el-button @click="resetPasswordForm">清空输入</el-button>
              <el-button type="primary" :loading="updatingPassword" @click="savePassword">
                更新密码
              </el-button>
            </div>
          </el-form>
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const userStore = useUserStore()
const loadingProfile = ref(false)
const savingProfile = ref(false)
const updatingPassword = ref(false)
const profileFormRef = ref(null)
const passwordFormRef = ref(null)
const currentProfile = ref(userStore.user ? { ...userStore.user } : null)
const profileSnapshot = ref({
  name: userStore.user?.name || '',
  major: userStore.user?.major || '',
  grade: userStore.user?.grade || ''
})

const profileForm = reactive({
  name: userStore.user?.name || '',
  major: userStore.user?.major || '',
  grade: userStore.user?.grade || ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  major: [
    { required: true, message: '请输入专业', trigger: 'blur' }
  ],
  grade: [
    { required: true, message: '请输入年级', trigger: 'blur' }
  ]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error('请再次输入新密码'))
          return
        }

        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的新密码不一致'))
          return
        }

        callback()
      },
      trigger: 'blur'
    }
  ]
}

const roleLabel = computed(() => currentProfile.value?.role === 'admin' ? '管理员账号' : '学生账号')
const statusLabel = computed(() => currentProfile.value?.status === 'active' ? '正常使用' : '状态异常')
const displayName = computed(() => currentProfile.value?.name || '校园用户')

const profileCompletion = computed(() => {
  const fields = [
    currentProfile.value?.studentId,
    currentProfile.value?.email,
    profileForm.name,
    profileForm.major,
    profileForm.grade
  ]

  const completed = fields.filter((item) => String(item || '').trim()).length
  return Math.round((completed / fields.length) * 100)
})

const createdAtLabel = computed(() => formatDate(currentProfile.value?.createdAt))

const isProfileDirty = computed(() => (
  profileForm.name.trim() !== profileSnapshot.value.name ||
  profileForm.major.trim() !== profileSnapshot.value.major ||
  profileForm.grade.trim() !== profileSnapshot.value.grade
))

function formatDate(value) {
  if (!value) {
    return '暂无记录'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function applyProfile(profile) {
  currentProfile.value = profile ? { ...profile } : null
  profileSnapshot.value = {
    name: profile?.name || '',
    major: profile?.major || '',
    grade: profile?.grade || ''
  }

  profileForm.name = profileSnapshot.value.name
  profileForm.major = profileSnapshot.value.major
  profileForm.grade = profileSnapshot.value.grade

  if (profile) {
    userStore.setUser(profile)
  }
}

async function loadProfile() {
  loadingProfile.value = true

  try {
    const res = await authApi.getUserInfo()
    applyProfile(res.data)
  } catch (error) {
    console.error('加载个人信息失败:', error)
  } finally {
    loadingProfile.value = false
  }
}

async function reloadProfile() {
  await loadProfile()
  profileFormRef.value?.clearValidate()
}

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.clearValidate()
}

function handleClose() {
  emit('update:modelValue', false)
}

async function saveProfile() {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
  } catch (error) {
    return
  }

  if (!isProfileDirty.value) {
    ElMessage.info('当前没有需要保存的修改')
    return
  }

  savingProfile.value = true
  try {
    const res = await authApi.updateProfile({
      name: profileForm.name.trim(),
      major: profileForm.major.trim(),
      grade: profileForm.grade.trim()
    })

    applyProfile(res.data)
    ElMessage.success(res.message || '个人信息已更新')
  } catch (error) {
    console.error('保存个人信息失败:', error)
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
  } catch (error) {
    return
  }

  updatingPassword.value = true
  try {
    const res = await authApi.updatePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    resetPasswordForm()
    ElMessage.success(res.message || '密码修改成功')
  } catch (error) {
    console.error('更新密码失败:', error)
  } finally {
    updatingPassword.value = false
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      loadProfile()
      return
    }

    resetPasswordForm()
    profileFormRef.value?.clearValidate()
  }
)
</script>

<style scoped>
:deep(.profile-dialog .el-dialog) {
  overflow: hidden;
}

:deep(.profile-dialog .el-dialog__header) {
  margin-right: 0;
  padding-bottom: 6px;
}

:deep(.profile-dialog .el-dialog__body) {
  padding-top: 10px;
}

.profile-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.profile-dialog__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(79, 124, 255, 0.1);
  color: var(--app-primary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-dialog__header h2 {
  margin: 14px 0 8px;
  font-size: 30px;
  color: #13213f;
}

.profile-dialog__header p {
  margin: 0;
  color: var(--app-text-soft);
}

.profile-dialog__role {
  padding: 10px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.14), rgba(0, 194, 168, 0.12));
  color: #1e40af;
  font-weight: 700;
  white-space: nowrap;
}

.profile-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.profile-summary {
  padding: 24px;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(17, 24, 39, 0.92), rgba(30, 41, 59, 0.88)),
    radial-gradient(circle at top, rgba(79, 124, 255, 0.28), transparent 40%);
  color: #fff;
}

.profile-summary__hero {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-summary__avatar {
  background: linear-gradient(135deg, #4f7cff, #00c2a8);
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  box-shadow: 0 16px 36px rgba(79, 124, 255, 0.28);
}

.profile-summary__hero strong {
  display: block;
  font-size: 22px;
}

.profile-summary__hero p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.72);
}

.profile-progress {
  margin-top: 24px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
}

.profile-progress__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.profile-progress__row span {
  color: rgba(255, 255, 255, 0.72);
}

.profile-progress__row strong {
  font-size: 22px;
}

.profile-meta {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.profile-meta__item {
  padding: 16px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.profile-meta__item span {
  display: block;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
}

.profile-meta__item strong {
  word-break: break-word;
  font-size: 15px;
}

.profile-summary__tips {
  margin-top: 20px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.16), rgba(0, 194, 168, 0.12));
}

.profile-summary__tips span {
  display: block;
  margin-bottom: 10px;
  font-weight: 700;
}

.profile-summary__tips p {
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.78);
}

.profile-content {
  display: grid;
  gap: 20px;
}

.profile-card {
  padding: 24px;
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.84));
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 22px 52px rgba(15, 23, 42, 0.08);
}

.profile-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.profile-card__header h3 {
  margin: 0;
  font-size: 22px;
  color: #13213f;
}

.profile-card__header p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
  line-height: 1.7;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-dialog__header {
    flex-direction: column;
  }

  .profile-form__grid {
    grid-template-columns: 1fr;
  }

  .profile-actions {
    flex-direction: column-reverse;
  }

  .profile-actions .el-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>

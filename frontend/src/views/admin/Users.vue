<template>
  <div class="users-page">
    <el-card class="setting-card">
      <div class="setting-row">
        <div>
          <strong>访客浏览功能</strong>
          <p>开启后，未登录访客只能浏览、查找公开商品/帖子/资料并查看商家联系方式；关闭后访客无法使用这些公开浏览能力。</p>
        </div>
        <el-switch
          v-model="guestAccessEnabled"
          :loading="guestSettingLoading"
          active-text="已开启"
          inactive-text="已关闭"
          @change="updateGuestAccess"
        />
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <div class="header-actions">
            <el-input v-model="keyword" placeholder="搜索用户" prefix-icon="Search" style="width: 220px" @input="loadUsers" />
            <el-button type="primary" @click="openCreateDialog">新增用户</el-button>
          </div>
        </div>
      </template>

      <el-table :data="users" stripe>
        <el-table-column prop="studentId" label="账号/学号" min-width="140" />
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="major" label="专业/店铺" min-width="150" />
        <el-table-column prop="grade" label="年级" width="90" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'merchant' ? 'warning' : 'success'">
              {{ roleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              :type="row.status === 'active' ? 'warning' : 'success'"
              size="small"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button type="danger" size="small" @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="560px">
      <el-form ref="userFormRef" :model="userForm" :rules="rules" label-width="92px">
        <el-form-item label="账号/学号" prop="studentId">
          <el-input v-model="userForm.studentId" placeholder="学生/管理员请输入10位学号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" placeholder="学生/管理员使用 @chd.edu.cn 邮箱" />
        </el-form-item>
        <el-form-item label="密码" :prop="editingUser ? '' : 'password'">
          <el-input v-model="userForm.password" type="password" show-password placeholder="新增必填，编辑时留空表示不修改" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="userForm.major" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-input v-model="userForm.grade" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%" :disabled="editingUser?.role === 'merchant'">
            <el-option label="普通用户" value="student" />
            <el-option label="管理员" value="admin" />
            <el-option label="商家" value="merchant" disabled />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="userForm.status" style="width: 100%">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api'

const users = ref([])
const keyword = ref('')
const dialogVisible = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const userFormRef = ref(null)
const guestAccessEnabled = ref(true)
const guestSettingLoading = ref(false)

const emptyForm = () => ({
  studentId: '',
  email: '',
  password: '',
  name: '',
  major: '',
  grade: '',
  role: 'student',
  status: 'active'
})

const userForm = ref(emptyForm())

const rules = {
  studentId: [{ required: true, message: '请输入账号/学号', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  major: [{ required: true, message: '请输入专业', trigger: 'blur' }],
  grade: [{ required: true, message: '请输入年级', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const roleText = (role) => {
  if (role === 'admin') return '管理员'
  if (role === 'merchant') return '商家'
  return '普通用户'
}

const statusText = (status) => {
  if (status === 'active') return '正常'
  if (status === 'pending') return '待审核'
  if (status === 'rejected') return '已拒绝'
  return '禁用'
}

const loadUsers = async () => {
  try {
    const res = await adminApi.getUsers({ keyword: keyword.value })
    users.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

const loadGuestAccess = async () => {
  try {
    const res = await adminApi.getGuestAccess()
    guestAccessEnabled.value = res.data?.guestAccessEnabled !== false
  } catch (error) {
    console.error('读取访客设置失败:', error)
  }
}

const updateGuestAccess = async (value) => {
  guestSettingLoading.value = true
  try {
    const res = await adminApi.updateGuestAccess({ guestAccessEnabled: value })
    guestAccessEnabled.value = res.data?.guestAccessEnabled !== false
    ElMessage.success(guestAccessEnabled.value ? '访客浏览已开启' : '访客浏览已关闭')
  } catch (error) {
    guestAccessEnabled.value = !value
    console.error('更新访客设置失败:', error)
  } finally {
    guestSettingLoading.value = false
  }
}

const openCreateDialog = () => {
  editingUser.value = null
  userForm.value = emptyForm()
  dialogVisible.value = true
}

const openEditDialog = (user) => {
  editingUser.value = user
  userForm.value = {
    studentId: user.studentId,
    email: user.email,
    password: '',
    name: user.name,
    major: user.major,
    grade: user.grade,
    role: user.role === 'merchant' ? 'merchant' : user.role || 'student',
    status: user.status || 'active'
  }
  dialogVisible.value = true
}

const submitUser = async () => {
  if (!userFormRef.value) return
  await userFormRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const payload = { ...userForm.value }
      if (editingUser.value && !payload.password) {
        delete payload.password
      }
      if (editingUser.value) {
        await adminApi.updateUser(editingUser.value.id, payload)
      } else {
        await adminApi.addUser(payload)
      }
      ElMessage.success('保存成功')
      dialogVisible.value = false
      loadUsers()
    } catch (error) {
      console.error('保存用户失败:', error)
    } finally {
      saving.value = false
    }
  })
}

const toggleStatus = async (user) => {
  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  try {
    await adminApi.updateUserStatus(user.id, { status: newStatus })
    user.status = newStatus
    ElMessage.success('操作成功')
  } catch (error) {
    console.error('更新用户状态失败:', error)
  }
}

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`确定删除用户「${user.name}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await adminApi.deleteUser(user.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
    }
  }
}

onMounted(() => {
  loadUsers()
  loadGuestAccess()
})
</script>

<style scoped>
.users-page {
  padding: 0;
}

.setting-card {
  margin-bottom: 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.setting-row strong {
  display: block;
  margin-bottom: 6px;
}

.setting-row p {
  margin: 0;
  color: var(--app-text-soft);
  line-height: 1.7;
}

.card-header,
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
</style>

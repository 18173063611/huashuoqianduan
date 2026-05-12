<template>
  <section class="admin-users-page">
    <el-card shadow="never">
      <template #header>
        <div class="admin-users-header">
          <span>账号增删改查与积分入口</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">新增账号</el-button>
        </div>
      </template>

      <el-form class="admin-users-filter" :model="filters" inline>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="用户名 / 展示名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" clearable placeholder="全部角色" style="width: 140px">
            <el-option label="普通用户" value="USER" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="启用" value="ENABLED" />
            <el-option label="禁用" value="DISABLED" />
            <el-option label="锁定" value="LOCKED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-users-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="users" row-key="userId" border>
        <el-table-column prop="userId" label="ID" width="86" />
        <el-table-column prop="username" label="账号" min-width="140" />
        <el-table-column prop="displayName" label="展示名" min-width="140" />
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'" effect="plain">
              {{ row.role === 'ADMIN' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="积分" width="110">
          <template #default="{ row }">{{ row.creditBalance ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="410" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="openCredit(row)">积分</el-button>
            <el-button link type="warning" :disabled="isBuiltinAdmin(row)" @click="toggleStatus(row)">
              {{ row.status === 'ENABLED' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="primary" @click="resetPassword(row)">重置密码</el-button>
            <el-button link type="danger" :disabled="isBuiltinAdmin(row)" @click="removeUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="admin-users-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadUsers"
        @current-change="loadUsers"
      />
    </el-card>

    <AdminUserEditorDrawer
      v-model:visible="editorVisible"
      :editing-user-id="editingUserId"
      :initial-value="userForm"
      :protected-user="protectedEditingUser"
      :saving="saving"
      @save="saveUser"
    />

    <AdminCreditAdjustDialog
      v-model:visible="creditVisible"
      :user="selectedUser"
      :account="creditAccount"
      :logs="creditLogs"
      :logs-loading="creditLogsLoading"
      :saving="creditSaving"
      @submit="submitCreditAdjust"
    />
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  adjustAdminUserCredits,
  createAdminUser,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  getAdminUserCreditAccount,
  listAdminUserCreditLogs,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../../services/adminApi'
import type {
  AdminCreditAccount,
  AdminCreditAdjustRequest,
  AdminCreditLogItem,
  AdminUserItem,
  AdminUserQuery,
  AdminUserSaveRequest,
} from '../../types/adminTypes'
import AdminCreditAdjustDialog from './components/AdminCreditAdjustDialog.vue'
import AdminUserEditorDrawer from './components/AdminUserEditorDrawer.vue'

const filters = reactive<Required<Pick<AdminUserQuery, 'pageNo' | 'pageSize'>> & Omit<AdminUserQuery, 'pageNo' | 'pageSize'>>({
  keyword: '',
  role: '',
  status: '',
  pageNo: 1,
  pageSize: 10,
})
const router = useRouter()
const users = ref<AdminUserItem[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const protectedEditingUser = ref(false)

const editorVisible = ref(false)
const editingUserId = ref<number | null>(null)
const userForm = reactive<AdminUserSaveRequest>({
  username: '',
  password: '',
  displayName: '',
  role: 'USER',
  status: 'ENABLED',
  remark: '',
})

const creditVisible = ref(false)
const creditSaving = ref(false)
const selectedUser = ref<AdminUserItem | null>(null)
const creditAccount = ref<AdminCreditAccount | null>(null)
const creditLogs = ref<AdminCreditLogItem[]>([])
const creditLogsLoading = ref(false)

function statusText(status: string) {
  return status === 'ENABLED' ? '启用' : status === 'DISABLED' ? '禁用' : '锁定'
}

function statusTagType(status: string) {
  if (status === 'ENABLED') return 'success'
  if (status === 'DISABLED') return 'info'
  return 'warning'
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminUsers(filters)
    users.value = page.records
    total.value = page.total
  } catch (unknownError) {
    users.value = []
    total.value = 0
    error.value = requestErrorMessage(unknownError)
  } finally {
    loading.value = false
  }
}

function requestErrorMessage(unknownError: unknown) {
  return unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
}

function handleSearch() {
  filters.pageNo = 1
  void loadUsers()
}

function resetFilters() {
  Object.assign(filters, { keyword: '', role: '', status: '', pageNo: 1, pageSize: 10 })
  void loadUsers()
}

function openCreate() {
  editingUserId.value = null
  protectedEditingUser.value = false
  Object.assign(userForm, { username: '', password: '', displayName: '', role: 'USER', status: 'ENABLED', remark: '' })
  editorVisible.value = true
}

function openDetail(row: AdminUserItem) {
  void router.push({ name: 'admin-user-detail', params: { userId: row.userId } })
}

function openEdit(row: AdminUserItem) {
  editingUserId.value = row.userId
  protectedEditingUser.value = isBuiltinAdmin(row)
  Object.assign(userForm, {
    username: row.username,
    password: '',
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    remark: row.remark || '',
  })
  editorVisible.value = true
}

function isBuiltinAdmin(row: AdminUserItem) {
  return row.username?.toLowerCase() === 'admin'
}

async function saveUser(payload: AdminUserSaveRequest) {
  saving.value = true
  try {
    if (editingUserId.value) await updateAdminUser(editingUserId.value, payload)
    else await createAdminUser(payload)
    ElMessage.success('账号已保存')
    editorVisible.value = false
    await loadUsers()
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: AdminUserItem) {
  if (row.status === 'ENABLED') await disableAdminUser(row.userId)
  else await enableAdminUser(row.userId)
  ElMessage.success('账号状态已更新')
  await loadUsers()
}

async function resetPassword(row: AdminUserItem) {
  const result = await ElMessageBox.prompt(`为 ${row.username} 设置新密码`, '重置密码', {
    inputType: 'password',
    inputPattern: /^.{6,60}$/,
    inputErrorMessage: '密码长度需为 6 到 60 位',
  })
  await resetAdminUserPassword(row.userId, { password: result.value })
  ElMessage.success('密码已重置')
}

async function removeUser(row: AdminUserItem) {
  await ElMessageBox.confirm(`确认删除账号 ${row.username}？`, '删除账号', { type: 'warning' })
  await deleteAdminUser(row.userId)
  ElMessage.success('账号已删除')
  await loadUsers()
}

async function openCredit(row: AdminUserItem) {
  selectedUser.value = row
  creditVisible.value = true
  creditAccount.value = null
  creditLogs.value = []
  try {
    creditAccount.value = await getAdminUserCreditAccount(row.userId)
  } catch {
    ElMessage.warning('积分账户接口尚未联调完成')
  }
  await loadCreditLogs(row.userId)
}

async function submitCreditAdjust(payload: AdminCreditAdjustRequest) {
  if (!selectedUser.value) return
  creditSaving.value = true
  try {
    await adjustAdminUserCredits(selectedUser.value.userId, payload)
    ElMessage.success('积分已调整')
    creditAccount.value = await getAdminUserCreditAccount(selectedUser.value.userId)
    await loadCreditLogs(selectedUser.value.userId)
    creditVisible.value = false
    await loadUsers()
  } finally {
    creditSaving.value = false
  }
}

async function loadCreditLogs(userId: number) {
  creditLogsLoading.value = true
  try {
    const page = await listAdminUserCreditLogs(userId, 1, 20)
    creditLogs.value = page.records
  } finally {
    creditLogsLoading.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<style scoped>
.admin-users-page,
.admin-users-header {
  display: grid;
  gap: 16px;
}

.admin-users-header {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.admin-users-filter {
  margin-bottom: 8px;
}

.admin-users-alert {
  margin-bottom: 14px;
}

.admin-users-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

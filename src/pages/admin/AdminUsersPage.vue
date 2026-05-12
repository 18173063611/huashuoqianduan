<template>
  <section class="admin-users-page">
    <div class="page-heading">
      <div>
        <h2>用户管理</h2>
        <p>查找用户、查看积分状态，并执行启用禁用、重置密码和积分调整。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadUsers">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增账号</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-form class="admin-users-filter" :model="filters" inline>
        <el-form-item label="账号/昵称">
          <el-input v-model="filters.keyword" clearable placeholder="输入账号或昵称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" clearable placeholder="全部角色" style="width: 140px">
            <el-option label="普通用户" value="USER" />
            <el-option label="系统管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="正常" value="ENABLED" />
            <el-option label="已禁用" value="DISABLED" />
            <el-option label="已锁定" value="LOCKED" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-users-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="users" row-key="userId" border :empty-text="emptyText">
        <el-table-column prop="userId" label="用户ID" width="92" />
        <el-table-column label="登录账号" min-width="140">
          <template #default="{ row }">{{ formatEmpty(row.username) }}</template>
        </el-table-column>
        <el-table-column label="用户昵称" min-width="140">
          <template #default="{ row }">{{ formatEmpty(row.displayName) }}</template>
        </el-table-column>
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'" effect="plain">{{ getRoleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getTagTypeByStatus(row.status)">{{ getUserStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前积分" width="120">
          <template #default="{ row }">{{ formatCreditAmount(row.creditBalance) }}</template>
        </el-table-column>
        <el-table-column label="最近登录时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.lastLoginAt, '暂无登录记录') }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="390" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link :type="row.status === 'ENABLED' ? 'warning' : 'success'" :disabled="isBuiltinAdmin(row)" @click="toggleStatus(row)">
              {{ row.status === 'ENABLED' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="primary" @click="resetPassword(row)">重置密码</el-button>
            <el-button link type="primary" @click="openCredit(row)">调整积分</el-button>
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
import { computed, onMounted, reactive, ref } from 'vue'
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
import {
  formatCreditAmount,
  formatDateTime,
  formatEmpty,
  getEmptyText,
  getRoleLabel,
  getTagTypeByStatus,
  getUserStatusLabel,
} from '../../utils/adminDisplay'
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
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无用户记录'))

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
    error.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadUsers()
}

function resetFilters() {
  Object.assign(filters, { keyword: '', role: '', status: '', pageNo: 1, pageSize: 10 })
  void loadUsers()
}

function hasFilter() {
  return Boolean(filters.keyword || filters.role || filters.status)
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
    phone: row.phone || '',
    email: row.email || '',
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
    confirmButtonText: '确认重置',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPattern: /^.{6,60}$/,
    inputErrorMessage: '密码长度需要为 6 到 60 位',
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
    ElMessage.warning('加载积分账户失败，请稍后重试')
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

onMounted(loadUsers)
</script>

<style scoped>
.admin-users-page,
.page-heading {
  display: grid;
  gap: 16px;
}

.page-heading {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.page-heading h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.page-heading p {
  margin: 6px 0 0;
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 10px;
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

<template>
  <section class="admin-user-detail">
    <header class="detail-hero">
      <div class="detail-hero-main">
        <el-button class="back-button" text :icon="ArrowLeft" @click="goBack">返回用户列表</el-button>
        <div class="detail-title-row">
          <div>
            <h2>用户详情</h2>
            <p v-if="user">
              登录账号：{{ user.username }} · 用户ID：{{ user.userId }} · 账号状态：{{ getUserStatusLabel(user.status) }}
            </p>
            <p v-else>查看用户账号、积分、任务和流水情况</p>
          </div>
          <el-tag v-if="user" :type="getTagTypeByStatus(user.status)" effect="light">
            {{ getUserStatusLabel(user.status) }}
          </el-tag>
        </div>
      </div>

      <div class="detail-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
        <el-button
          v-if="user"
          :type="user.status === 'ENABLED' ? 'warning' : 'success'"
          :loading="statusSaving"
          @click="toggleUserStatus"
        >
          {{ user.status === 'ENABLED' ? '禁用用户' : '启用用户' }}
        </el-button>
        <el-button v-if="user" :icon="Key" :loading="passwordSaving" @click="resetPassword">重置密码</el-button>
        <el-button v-if="user" type="primary" @click="openCreditAdjust">调整积分</el-button>
      </div>
    </header>

    <el-alert
      v-if="user && user.status !== 'ENABLED'"
      title="该账号当前不可正常使用，请检查账号状态"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card v-loading="loading" class="detail-card" shadow="never">
          <template #header><div class="detail-card-header">用户概览</div></template>
          <el-descriptions v-if="user" :column="2" border>
            <el-descriptions-item label="用户ID">{{ user.userId }}</el-descriptions-item>
            <el-descriptions-item label="登录账号">{{ formatEmpty(user.username) }}</el-descriptions-item>
            <el-descriptions-item label="用户昵称">{{ formatEmpty(user.displayName) }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              <el-tag :type="user.role === 'ADMIN' ? 'danger' : 'info'" effect="plain">{{ getRoleLabel(user.role) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="账号状态">
              <el-tag :type="getTagTypeByStatus(user.status)">{{ getUserStatusLabel(user.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="手机号">{{ formatEmpty(user.phone, '未填写') }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ formatEmpty(user.email, '未填写') }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ formatEmpty(user.remark) }}</el-descriptions-item>
            <el-descriptions-item label="最近登录时间">{{ formatDateTime(user.lastLoginAt, '暂无登录记录') }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(user.createdAt) }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无用户信息" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card v-loading="loading" class="detail-card" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <span>积分账户</span>
              <el-button v-if="user" type="primary" link @click="openCreditAdjust">调整积分</el-button>
            </div>
          </template>
          <div v-if="account" class="credit-metrics">
            <div class="metric-card metric-card--primary">
              <span>当前可用积分</span>
              <strong>{{ account.balance ?? 0 }}</strong>
            </div>
            <div class="metric-card"><span>冻结积分</span><strong>{{ account.frozenBalance ?? 0 }}</strong></div>
            <div class="metric-card"><span>累计增加</span><strong>{{ account.totalRecharged ?? 0 }}</strong></div>
            <div class="metric-card"><span>累计消耗</span><strong>{{ account.totalConsumed ?? 0 }}</strong></div>
          </div>
          <el-empty v-else description="暂无积分账户" />
          <el-alert
            v-if="account && account.balance < LOW_BALANCE_THRESHOLD"
            class="credit-warning"
            title="余额不足，用户将无法提交需要积分的 AI 任务"
            type="warning"
            show-icon
            :closable="false"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="detail-card" shadow="never">
      <template #header>
        <div class="detail-card-header">
          <span>最近任务</span>
          <el-button link type="primary" @click="openTaskFilter">查看全部任务</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tasks" row-key="taskId" border empty-text="该用户暂无任务记录">
        <el-table-column prop="taskId" label="任务ID" width="95" />
        <el-table-column label="任务类型" min-width="150">
          <template #default="{ row }">{{ getTaskTypeLabel(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="当前状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getTagTypeByStatus(row.status)" effect="plain">{{ getTaskStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column label="消耗积分" width="110">
          <template #default="{ row }">{{ formatCreditAmount(row.creditCost) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showTaskDetail(row)">查看详情</el-button>
            <el-button v-if="row.status === 'RETRYABLE'" link type="warning" @click="handleRetryTask(row.taskId)">重试</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="detail-card" shadow="never">
      <template #header>
        <div class="detail-card-header">
          <span>最近积分流水</span>
          <el-button link type="primary" @click="openCreditFilter">查看全部流水</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="creditLogs" row-key="creditLogId" border empty-text="该用户暂无积分流水">
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">{{ getCreditChangeTypeLabel(row.changeType) }}</template>
        </el-table-column>
        <el-table-column label="变动" width="100">
          <template #default="{ row }">
            <span :class="['credit-change', Number(row.changeAmount) >= 0 ? 'is-positive' : 'is-negative']">
              {{ formatCreditChange(row.changeAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动前" width="110">
          <template #default="{ row }">{{ formatCreditAmount(row.beforeBalance) }}</template>
        </el-table-column>
        <el-table-column label="变动后" width="110">
          <template #default="{ row }">{{ formatCreditAmount(row.afterBalance) }}</template>
        </el-table-column>
        <el-table-column label="关联任务" width="110">
          <template #default="{ row }">{{ row.relatedTaskId || '无' }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.remark, '暂无备注') }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <AdminCreditAdjustDialog
      v-model:visible="creditAdjustVisible"
      :user="user"
      :account="account"
      :logs="creditLogs"
      :logs-loading="loading"
      :saving="creditSaving"
      @submit="submitCreditAdjust"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Key, Refresh } from '@element-plus/icons-vue'
import {
  adjustAdminUserCredits,
  disableAdminUser,
  enableAdminUser,
  getAdminUser,
  getAdminUserCreditAccount,
  listAdminTasks,
  listAdminUserCreditLogs,
  resetAdminUserPassword,
} from '../../services/adminApi'
import { retryTask } from '../../services/taskApi'
import type {
  AdminCreditAccount,
  AdminCreditAdjustRequest,
  AdminCreditLogItem,
  AdminTaskItem,
  AdminUserItem,
} from '../../types/adminTypes'
import {
  compactCode,
  formatCreditAmount,
  formatCreditChange,
  formatDateTime,
  formatEmpty,
  getCreditChangeTypeLabel,
  getRoleLabel,
  getTagTypeByStatus,
  getTaskStatusLabel,
  getTaskTypeLabel,
  getUserStatusLabel,
} from '../../utils/adminDisplay'
import AdminCreditAdjustDialog from './components/AdminCreditAdjustDialog.vue'

const LOW_BALANCE_THRESHOLD = 10
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const user = ref<AdminUserItem | null>(null)
const account = ref<AdminCreditAccount | null>(null)
const tasks = ref<AdminTaskItem[]>([])
const creditLogs = ref<AdminCreditLogItem[]>([])
const creditAdjustVisible = ref(false)
const creditSaving = ref(false)
const statusSaving = ref(false)
const passwordSaving = ref(false)
const userId = computed(() => Number(route.params.userId))

async function loadData() {
  if (!Number.isFinite(userId.value) || userId.value <= 0) {
    error.value = '用户 ID 无效'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [loadedUser, loadedAccount, taskPage, logPage] = await Promise.all([
      getAdminUser(userId.value),
      getAdminUserCreditAccount(userId.value),
      listAdminTasks({ ownerUserId: userId.value, pageNo: 1, pageSize: 10 }),
      listAdminUserCreditLogs(userId.value, 1, 10),
    ])
    user.value = loadedUser
    account.value = loadedAccount
    tasks.value = taskPage.records
    creditLogs.value = logPage.records
  } catch (unknownError) {
    error.value = unknownError instanceof Error ? unknownError.message : '用户详情加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  void router.push({ name: 'admin-users' })
}

function openTaskFilter() {
  void router.push({ path: '/admin/tasks', query: { ownerUserId: String(userId.value) } })
}

function openCreditFilter() {
  void router.push({ path: '/admin/credit-logs', query: { userId: String(userId.value) } })
}

function openCreditAdjust() {
  creditAdjustVisible.value = true
}

async function toggleUserStatus() {
  if (!user.value) return
  statusSaving.value = true
  try {
    if (user.value.status === 'ENABLED') await disableAdminUser(user.value.userId)
    else await enableAdminUser(user.value.userId)
    ElMessage.success('账号状态已更新')
    await loadData()
  } finally {
    statusSaving.value = false
  }
}

async function resetPassword() {
  if (!user.value) return
  const result = await ElMessageBox.prompt(`为 ${user.value.username} 设置新密码`, '重置密码', {
    confirmButtonText: '确认重置',
    cancelButtonText: '取消',
    inputType: 'password',
    inputPattern: /^.{6,60}$/,
    inputErrorMessage: '密码长度需要为 6 到 60 位',
  })
  passwordSaving.value = true
  try {
    await resetAdminUserPassword(user.value.userId, { password: result.value })
    ElMessage.success('密码已重置')
  } finally {
    passwordSaving.value = false
  }
}

function showTaskDetail(row: AdminTaskItem) {
  ElMessageBox.alert(
    [
      `任务ID：${row.taskId}`,
      `任务类型：${getTaskTypeLabel(row.taskType)}`,
      `当前状态：${getTaskStatusLabel(row.status)}`,
      `使用模型：${compactCode(row.modelCode)}`,
      `消耗积分：${formatCreditAmount(row.creditCost)}`,
      `创建时间：${formatDateTime(row.createdAt)}`,
      row.errorMessage ? `失败原因：${row.errorMessage}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    '任务详情',
    { confirmButtonText: '知道了' },
  )
}

async function handleRetryTask(taskId: number) {
  await retryTask(taskId)
  ElMessage.success('任务已提交重试')
  await loadData()
}

async function submitCreditAdjust(payload: AdminCreditAdjustRequest) {
  if (!Number.isFinite(userId.value) || userId.value <= 0) return
  creditSaving.value = true
  try {
    await adjustAdminUserCredits(userId.value, payload)
    ElMessage.success('积分已调整')
    creditAdjustVisible.value = false
    await loadData()
  } finally {
    creditSaving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.admin-user-detail {
  display: grid;
  gap: 16px;
}

.detail-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 20px;
}

.detail-hero-main {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.back-button {
  justify-self: start;
  padding-left: 0;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title-row h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.detail-title-row p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.detail-card {
  border-radius: 8px;
}

.detail-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.credit-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: grid;
  gap: 8px;
  min-height: 96px;
  align-content: center;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #f8fafc;
  padding: 14px;
}

.metric-card span {
  color: #6b7280;
  font-size: 13px;
}

.metric-card strong {
  color: #111827;
  font-size: 24px;
}

.metric-card--primary {
  border-color: rgba(64, 158, 255, 0.24);
  background: #ecf5ff;
}

.metric-card--primary strong {
  color: #1d4ed8;
  font-size: 34px;
}

.credit-warning {
  margin-top: 12px;
}

.credit-change {
  font-weight: 700;
}

.credit-change.is-positive {
  color: #16a34a;
}

.credit-change.is-negative {
  color: #dc2626;
}

:deep(.el-descriptions__label) {
  width: 112px;
  color: #6b7280;
  font-weight: 600;
}

:deep(.el-table .cell) {
  line-height: 1.5;
}
</style>

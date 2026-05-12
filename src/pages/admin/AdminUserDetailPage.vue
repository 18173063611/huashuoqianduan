<template>
  <section class="admin-user-detail">
    <el-page-header :content="user ? `${user.username} 用户详情` : '用户详情'" @back="goBack" />

    <el-alert v-if="error" :title="error" type="warning" show-icon :closable="false" />

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card v-loading="loading" shadow="never">
          <template #header>
            <div class="detail-card-header">
              <span>账号信息</span>
              <el-button link type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
            </div>
          </template>
          <el-descriptions v-if="user" :column="1" border>
            <el-descriptions-item label="用户ID">{{ user.userId }}</el-descriptions-item>
            <el-descriptions-item label="账号">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="展示名">{{ user.displayName }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              <el-tag :type="user.role === 'ADMIN' ? 'danger' : 'info'" effect="plain">
                {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(user.status)">{{ statusText(user.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="手机">{{ user.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ user.remark || '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近登录">{{ user.lastLoginAt || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ user.createdAt || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card v-loading="loading" shadow="never">
          <template #header>
            <span>积分账户</span>
          </template>
          <div v-if="account" class="credit-summary">
            <strong>{{ account.balance }}</strong>
            <span>当前可用积分</span>
            <p>累计增加 {{ account.totalRecharged ?? 0 }} · 累计消耗 {{ account.totalConsumed ?? 0 }}</p>
            <p>冻结积分 {{ account.frozenBalance ?? 0 }}</p>
          </div>
          <el-empty v-else description="暂无积分账户" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div class="detail-card-header">
          <span>最近任务</span>
          <el-button link type="primary" @click="openTaskFilter">查看全部任务</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tasks" row-key="taskId" border>
        <el-table-column prop="taskId" label="任务ID" width="95" />
        <el-table-column label="类型" min-width="150">
          <template #default="{ row }">{{ taskTypeText(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">{{ taskStatusText(row.status) }}</template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="90" />
        <el-table-column label="模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column prop="creditCost" label="积分" width="90" />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="detail-card-header">
          <span>最近积分流水</span>
          <el-button link type="primary" @click="openCreditFilter">查看全部流水</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="creditLogs" row-key="creditLogId" border>
        <el-table-column prop="creditLogId" label="流水ID" width="100" />
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">{{ creditChangeTypeText(row.changeType) }}</template>
        </el-table-column>
        <el-table-column prop="changeAmount" label="变动" width="100" />
        <el-table-column prop="beforeBalance" label="前余额" width="100" />
        <el-table-column prop="afterBalance" label="后余额" width="100" />
        <el-table-column prop="relatedTaskId" label="任务ID" width="100">
          <template #default="{ row }">{{ row.relatedTaskId || '-' }}</template>
        </el-table-column>
        <el-table-column label="模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" min-width="170" />
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import {
  getAdminUser,
  getAdminUserCreditAccount,
  listAdminTasks,
  listAdminUserCreditLogs,
} from '../../services/adminApi'
import type {
  AdminCreditAccount,
  AdminCreditLogItem,
  AdminTaskItem,
  AdminUserItem,
} from '../../types/adminTypes'
import {
  compactCode,
  creditChangeTypeText,
  taskStatusText,
  taskTypeText,
} from './adminDisplay'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const user = ref<AdminUserItem | null>(null)
const account = ref<AdminCreditAccount | null>(null)
const tasks = ref<AdminTaskItem[]>([])
const creditLogs = ref<AdminCreditLogItem[]>([])

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

function statusText(status: string) {
  return status === 'ENABLED' ? '启用' : status === 'DISABLED' ? '禁用' : '锁定'
}

function statusTagType(status: string) {
  if (status === 'ENABLED') return 'success'
  if (status === 'DISABLED') return 'info'
  return 'warning'
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

onMounted(loadData)
</script>

<style scoped>
.admin-user-detail {
  display: grid;
  gap: 16px;
}

.detail-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.credit-summary {
  display: grid;
  gap: 8px;
}

.credit-summary strong {
  color: #111827;
  font-size: 34px;
  line-height: 1;
}

.credit-summary span {
  color: #6b7280;
}

.credit-summary p {
  margin: 0;
  color: #8a94a6;
  font-size: 13px;
}
</style>

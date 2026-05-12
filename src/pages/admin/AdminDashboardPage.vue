<template>
  <section class="admin-dashboard">
    <div class="page-heading">
      <div>
        <h2>运营概览</h2>
        <p>快速了解用户、任务、积分和模型的当前运营状态。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadDashboard">刷新</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="warning" show-icon :closable="false" />

    <el-row :gutter="16">
      <el-col v-for="card in statCards" :key="card.label" :xs="24" :sm="12" :lg="8">
        <el-card shadow="never" class="admin-stat-card">
          <span>{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="admin-dashboard-panel">
          <template #header>最近任务</template>
          <el-table v-loading="loading" :data="recentTasks" row-key="taskId" border empty-text="暂无任务记录">
            <el-table-column prop="taskId" label="任务ID" width="92" />
            <el-table-column label="任务类型" min-width="140">
              <template #default="{ row }">{{ getTaskTypeLabel(row.taskType) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="getTagTypeByStatus(row.status)">{{ getTaskStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="admin-dashboard-panel">
          <template #header>异常提醒</template>
          <el-empty v-if="alerts.length === 0" description="暂无异常提醒" />
          <el-alert v-for="alert in alerts" v-else :key="alert" class="dashboard-alert" :title="alert" type="warning" show-icon />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="admin-dashboard-panel">
      <template #header>最近积分流水</template>
      <el-table v-loading="loading" :data="recentCreditLogs" row-key="creditLogId" border empty-text="暂无积分流水">
        <el-table-column label="时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="类型" min-width="140">
          <template #default="{ row }">{{ getCreditChangeTypeLabel(row.changeType) }}</template>
        </el-table-column>
        <el-table-column label="变动" width="110">
          <template #default="{ row }">
            <span :class="['credit-change', Number(row.changeAmount) >= 0 ? 'is-positive' : 'is-negative']">
              {{ formatCreditChange(row.changeAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="100">
          <template #default="{ row }">{{ formatEmpty(row.userId) }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.remark, '暂无备注') }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getAdminDashboardSummary, listAdminCreditLogs, listAdminModels, listAdminTasks } from '../../services/adminApi'
import type { AdminCreditLogItem, AdminDashboardSummary, AdminTaskItem } from '../../types/adminTypes'
import {
  formatCreditAmount,
  formatCreditChange,
  formatDateTime,
  formatEmpty,
  getCreditChangeTypeLabel,
  getTagTypeByStatus,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../utils/adminDisplay'

const loading = ref(false)
const error = ref('')
const summary = ref<AdminDashboardSummary | null>(null)
const enabledModelCount = ref<number | null>(null)
const recentTasks = ref<AdminTaskItem[]>([])
const recentCreditLogs = ref<AdminCreditLogItem[]>([])

const statCards = computed(() => [
  { label: '用户总数', value: summary.value?.userCount ?? '暂无统计数据' },
  { label: '今日新增用户', value: '暂无统计数据' },
  { label: '今日任务数', value: summary.value?.todayTaskCount ?? '暂无统计数据' },
  { label: '今日积分消耗', value: summary.value ? formatCreditAmount(summary.value.todayCreditConsumed) : '暂无统计数据' },
  { label: '失败任务数', value: summary.value?.failedTaskCount ?? '暂无统计数据' },
  { label: '当前启用模型数', value: enabledModelCount.value ?? '暂无统计数据' },
])

const alerts = computed(() => {
  const items: string[] = []
  if ((summary.value?.failedTaskCount ?? 0) > 0) items.push('当前存在失败任务，请关注任务异常原因')
  if ((summary.value?.queueBacklog ?? 0) > 0) items.push(`当前有 ${summary.value?.queueBacklog} 个任务排队中`)
  return items
})

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [summaryResult, taskPage, creditPage, modelPage] = await Promise.allSettled([
      getAdminDashboardSummary(),
      listAdminTasks({ pageNo: 1, pageSize: 6 }),
      listAdminCreditLogs({ pageNo: 1, pageSize: 6 }),
      listAdminModels({ enabled: true, pageNo: 1, pageSize: 1 }),
    ])
    summary.value = summaryResult.status === 'fulfilled' ? summaryResult.value : null
    recentTasks.value = taskPage.status === 'fulfilled' ? taskPage.value.records : []
    recentCreditLogs.value = creditPage.status === 'fulfilled' ? creditPage.value.records : []
    enabledModelCount.value = modelPage.status === 'fulfilled' ? modelPage.value.total : null
    if (summaryResult.status === 'rejected') error.value = '部分概览统计暂不可用，已展示可获取的数据'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.admin-dashboard,
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

.admin-stat-card {
  min-height: 112px;
}

.admin-stat-card :deep(.el-card__body) {
  display: grid;
  gap: 14px;
}

.admin-stat-card span {
  color: #6b7280;
}

.admin-stat-card strong {
  color: #111827;
  font-size: 26px;
}

.admin-dashboard-panel {
  border-radius: 8px;
}

.dashboard-alert + .dashboard-alert {
  margin-top: 10px;
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
</style>

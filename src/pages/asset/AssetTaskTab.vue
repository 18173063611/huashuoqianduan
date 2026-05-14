<template>
  <div class="asset-hub-tab-scroll">
    <p class="asset-tab-hint">展示最近任务及预扣、实际消耗、退款与欠费等；点击「积分详情」打开计费拆解抽屉。</p>
    <p v-if="tasksError" class="asset-tab-error">{{ tasksError }}</p>
    <p v-else-if="!tasksLoading && recentTasks.length === 0" class="asset-tab-muted">暂无任务记录。</p>
    <div v-else class="table-scroll">
      <el-table :data="recentTasks" size="small" stripe border style="width: 100%" class="user-task-table-el">
        <el-table-column prop="taskId" label="ID" width="72" />
        <el-table-column label="类型" min-width="120">
          <template #default="{ row }">
            <el-tooltip v-if="row.taskType && row.taskType.trim()" :content="row.taskType" placement="top">
              <span>{{ taskTypeLabel(row.taskType) }}</span>
            </el-tooltip>
            <span v-else>{{ taskTypeLabel(row.taskType) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="modelCode" label="模型" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.modelCode || '—' }}</template>
        </el-table-column>
        <el-table-column label="积分（预扣/实际）" min-width="160">
          <template #default="{ row }">
            <div class="credit-cell">{{ taskCreditSummary(row) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="结算" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.settlementStatus" size="small" :type="settlementTagType(row.settlementStatus)">
              {{ settlementLabel(row.settlementStatus) }}
            </el-tag>
            <span v-else class="asset-tab-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="taskStatusTagType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="72">
          <template #default="{ row }">{{ row.progress ?? '—' }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatFriendlyDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$emit('openCreditDetail', row.taskId)">积分详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TaskItem } from '../../types/taskTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'
import { formatFriendlyDateTime } from '../../utils/timeFormat'
import { settlementLabel, settlementTagType, taskCreditSummary, taskStatusTagType } from './assetHubShared'

defineProps<{
  recentTasks: TaskItem[]
  tasksLoading: boolean
  tasksError: string
}>()

defineEmits<{
  openCreditDetail: [taskId: number]
}>()
</script>

<style scoped>
.asset-hub-tab-scroll {
  max-height: min(72vh, 720px);
  min-height: 280px;
  overflow: auto;
  padding-right: 2px;
}

.asset-tab-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.asset-tab-error {
  margin: 0 0 8px;
  font-size: 13px;
  color: #b45309;
}

.asset-tab-muted {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.table-scroll {
  overflow-x: auto;
  width: 100%;
}

.credit-cell {
  white-space: pre-line;
  font-size: 12px;
  line-height: 1.45;
  color: #334155;
}
</style>

<template>
  <div class="asset-hub-tab-scroll">
    <p class="asset-tab-hint">
      展示最近任务及预扣、实际消耗、退款与欠费等；按任务的完整计费拆解请点「积分详情」。流水级明细见「积分明细」Tab。
    </p>
    <p v-if="creditLogsError" class="asset-tab-error">{{ creditLogsError }}</p>
    <p v-else-if="!creditLogsLoading && creditLogs.length === 0" class="asset-tab-muted">暂无积分流水。</p>
    <div v-else class="table-scroll">
      <el-table :data="creditLogs" size="small" stripe border style="width: 100%" class="credit-log-table">
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ formatFriendlyDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="taskName" label="任务名称" min-width="120" show-overflow-tooltip />
        <el-table-column label="任务类型" min-width="130">
          <template #default="{ row }">
            <template v-if="!row.taskType || row.taskType.trim() === '' || row.taskType === '—'">
              <span>—</span>
            </template>
            <el-tooltip v-else :content="row.taskType" placement="top">
              <span>{{ taskTypeLabel(row.taskType) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="operationLabel" label="操作类型" width="110" show-overflow-tooltip />
        <el-table-column label="变动积分" width="110">
          <template #default="{ row }">
            <span :class="row.changeAmount < 0 ? 'amt-neg' : 'amt-pos'">{{ formatCreditDelta(row.changeAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="afterBalance" label="当前余额" width="100" />
        <el-table-column prop="status" label="状态" width="80" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccountCreditLogRecentRow } from '../../types/accountTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'
import { formatFriendlyDateTime } from '../../utils/timeFormat'
import { formatCreditDelta } from './assetHubShared'

defineProps<{
  creditLogs: AccountCreditLogRecentRow[]
  creditLogsLoading: boolean
  creditLogsError: string
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

.amt-neg {
  color: #b91c1c;
  font-weight: 600;
}
.amt-pos {
  color: #15803d;
  font-weight: 600;
}
</style>

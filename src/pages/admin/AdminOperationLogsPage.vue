<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>操作日志</h2>
        <p>追踪管理员关键操作，查看操作对象和前后快照。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadLogs">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="管理员">
          <el-input-number v-model="filters.adminUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.operationType" clearable placeholder="全部操作" filterable style="width: 170px">
            <el-option label="新增用户" value="USER_CREATE" />
            <el-option label="编辑用户" value="USER_UPDATE" />
            <el-option label="启用用户" value="USER_ENABLE" />
            <el-option label="禁用用户" value="USER_DISABLE" />
            <el-option label="重置密码" value="USER_RESET_PASSWORD" />
            <el-option label="调整积分" value="CREDIT_ADJUST" />
            <el-option label="保存模型" value="MODEL_SAVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型">
          <el-select v-model="filters.targetType" clearable placeholder="全部目标" style="width: 150px">
            <el-option label="用户" value="USER" />
            <el-option label="积分账户" value="CREDIT" />
            <el-option label="模型" value="MODEL" />
            <el-option label="任务" value="TASK" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" disabled />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="operationId" border :empty-text="emptyText">
        <el-table-column label="操作时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="管理员" width="100">
          <template #default="{ row }">{{ formatEmpty(row.adminUserId) }}</template>
        </el-table-column>
        <el-table-column label="操作类型" min-width="150">
          <template #default="{ row }">{{ getOperationTypeLabel(row.operationType) }}</template>
        </el-table-column>
        <el-table-column label="目标类型" width="120">
          <template #default="{ row }">{{ getOperationTargetTypeLabel(row.targetType) }}</template>
        </el-table-column>
        <el-table-column label="目标ID" width="100">
          <template #default="{ row }">{{ formatEmpty(row.targetId) }}</template>
        </el-table-column>
        <el-table-column label="IP" width="130">
          <template #default="{ row }">{{ formatEmpty(row.ip) }}</template>
        </el-table-column>
        <el-table-column label="TraceId" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatEmpty(row.traceId) }}</template>
        </el-table-column>
        <el-table-column label="操作摘要" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ buildSummary(row) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="admin-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadLogs"
        @current-change="loadLogs"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="操作详情" width="760px">
      <el-descriptions v-if="selectedLog" :column="2" border>
        <el-descriptions-item label="操作时间">{{ formatDateTime(selectedLog.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="管理员">{{ formatEmpty(selectedLog.adminUserId) }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ getOperationTypeLabel(selectedLog.operationType) }}</el-descriptions-item>
        <el-descriptions-item label="目标类型">{{ getOperationTargetTypeLabel(selectedLog.targetType) }}</el-descriptions-item>
        <el-descriptions-item label="目标ID">{{ formatEmpty(selectedLog.targetId) }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{ formatEmpty(selectedLog.ip) }}</el-descriptions-item>
        <el-descriptions-item label="TraceId" :span="2">{{ formatEmpty(selectedLog.traceId) }}</el-descriptions-item>
      </el-descriptions>
      <div class="snapshot-grid">
        <div>
          <h3>操作前</h3>
          <pre>{{ formatJson(selectedLog?.beforeJson) }}</pre>
        </div>
        <div>
          <h3>操作后</h3>
          <pre>{{ formatJson(selectedLog?.afterJson) }}</pre>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminOperationLogs } from '../../services/adminApi'
import type { AdminOperationLogItem, AdminOperationLogQuery } from '../../types/adminTypes'
import {
  formatDateTime,
  formatEmpty,
  getEmptyText,
  getOperationTargetTypeLabel,
  getOperationTypeLabel,
} from '../../utils/adminDisplay'

const filters = reactive<AdminOperationLogQuery>({ pageNo: 1, pageSize: 20 })
const records = ref<AdminOperationLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const detailVisible = ref(false)
const selectedLog = ref<AdminOperationLogItem | null>(null)
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无操作日志'))

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminOperationLogs(filters)
    records.value = page.records
    total.value = page.total
  } catch (unknownError) {
    records.value = []
    total.value = 0
    error.value = unknownError instanceof Error ? unknownError.message : '管理员接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadLogs()
}

function resetFilters() {
  Object.assign(filters, { adminUserId: undefined, operationType: '', targetType: '', pageNo: 1, pageSize: 20 })
  void loadLogs()
}

function hasFilter() {
  return Boolean(filters.adminUserId || filters.operationType || filters.targetType)
}

function showDetail(row: AdminOperationLogItem) {
  selectedLog.value = row
  detailVisible.value = true
}

function buildSummary(row: AdminOperationLogItem) {
  return `${getOperationTypeLabel(row.operationType)} ${getOperationTargetTypeLabel(row.targetType)} ${formatEmpty(
    row.targetId,
  )}`
}

function formatJson(value?: string | null) {
  if (!value) return '暂无'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

onMounted(loadLogs)
</script>

<style scoped>
.admin-page,
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

.admin-filter {
  margin-bottom: 10px;
}

.admin-page-alert {
  margin-bottom: 12px;
}

.admin-pagination {
  justify-content: flex-end;
  margin-top: 16px;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.snapshot-grid h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.snapshot-grid pre {
  max-height: 320px;
  overflow: auto;
  border-radius: 6px;
  background: #f8fafc;
  padding: 12px;
  white-space: pre-wrap;
}
</style>

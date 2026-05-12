<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>任务管理</h2>
        <p>查询全站 AI 任务执行情况，快速定位失败原因和异常任务。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadTasks">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.ownerUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="filters.taskType" clearable placeholder="全部任务类型" style="width: 170px">
            <el-option label="语音合成" value="TTS_GENERATE" />
            <el-option label="形象生成" value="AVATAR_GENERATE" />
            <el-option label="数字人口播" value="DIGITAL_HUMAN_GENERATE" />
            <el-option label="视频解析转写" value="DOUYIN_PARSE_TRANSCRIPT" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="排队中" value="QUEUED" />
            <el-option label="执行中" value="RUNNING" />
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAILED" />
            <el-option label="可重试" value="RETRYABLE" />
            <el-option label="已取消" value="CANCELED" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型编码">
          <el-input v-model="filters.modelCode" clearable placeholder="输入模型编码" />
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

      <el-table v-loading="loading" :data="records" row-key="taskId" border :empty-text="emptyText">
        <el-table-column prop="taskId" label="任务ID" width="95" />
        <el-table-column label="用户" width="100">
          <template #default="{ row }">{{ formatEmpty(row.ownerUserId) }}</template>
        </el-table-column>
        <el-table-column label="任务类型" min-width="150">
          <template #default="{ row }">{{ getTaskTypeLabel(row.taskType) }}</template>
        </el-table-column>
        <el-table-column label="当前状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getTagTypeByStatus(row.status)" effect="light">{{ getTaskStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="100">
          <template #default="{ row }">{{ Number(row.progress ?? 0) }}%</template>
        </el-table-column>
        <el-table-column label="使用模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column label="消耗积分" width="110">
          <template #default="{ row }">{{ formatCreditAmount(row.creditCost) }}</template>
        </el-table-column>
        <el-table-column label="错误摘要" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'error-text': row.status === 'FAILED' || row.status === 'RETRYABLE' }">
              {{ formatEmpty(row.errorMessage) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showTaskDetail(row)">查看详情</el-button>
            <el-button v-if="row.status === 'RETRYABLE'" link type="warning" @click="handleRetry(row)">重试</el-button>
            <el-button
              v-if="row.status === 'QUEUED' || row.status === 'RUNNING'"
              link
              type="danger"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="admin-pagination"
        v-model:current-page="filters.pageNo"
        v-model:page-size="filters.pageSize"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        :total="total"
        @size-change="loadTasks"
        @current-change="loadTasks"
      />
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { listAdminTasks } from '../../services/adminApi'
import { cancelTask, retryTask } from '../../services/taskApi'
import type { AdminTaskItem, AdminTaskQuery } from '../../types/adminTypes'
import {
  compactCode,
  formatCreditAmount,
  formatDateTime,
  formatEmpty,
  getEmptyText,
  getTagTypeByStatus,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../utils/adminDisplay'

const route = useRoute()
const filters = reactive<AdminTaskQuery>({
  ownerUserId: numberFromQuery(route.query.ownerUserId),
  taskType: stringFromQuery(route.query.taskType),
  status: stringFromQuery(route.query.status),
  modelCode: stringFromQuery(route.query.modelCode),
  pageNo: 1,
  pageSize: 10,
})
const records = ref<AdminTaskItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无任务记录'))

async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminTasks(filters)
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
  void loadTasks()
}

function resetFilters() {
  Object.assign(filters, { ownerUserId: undefined, taskType: '', status: '', modelCode: '', pageNo: 1, pageSize: 10 })
  void loadTasks()
}

function showTaskDetail(row: AdminTaskItem) {
  ElMessageBox.alert(
    [
      `任务ID：${row.taskId}`,
      `用户ID：${formatEmpty(row.ownerUserId)}`,
      `任务类型：${getTaskTypeLabel(row.taskType)}`,
      `当前状态：${getTaskStatusLabel(row.status)}`,
      `使用模型：${compactCode(row.modelCode)}`,
      `消耗积分：${formatCreditAmount(row.creditCost)}`,
      `创建时间：${formatDateTime(row.createdAt)}`,
      row.errorMessage ? `错误信息：${row.errorMessage}` : '',
      row.traceId ? `TraceId：${row.traceId}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    '任务详情',
    { confirmButtonText: '知道了' },
  )
}

async function handleRetry(row: AdminTaskItem) {
  await retryTask(row.taskId)
  ElMessage.success('任务已提交重试')
  await loadTasks()
}

async function handleCancel(row: AdminTaskItem) {
  await ElMessageBox.confirm(`确认取消任务 ${row.taskId}？`, '取消任务', { type: 'warning' })
  await cancelTask(row.taskId)
  ElMessage.success('任务已取消')
  await loadTasks()
}

function hasFilter() {
  return Boolean(filters.ownerUserId || filters.taskType || filters.status || filters.modelCode)
}

function stringFromQuery(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

function numberFromQuery(value: unknown) {
  const parsed = Number(stringFromQuery(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

onMounted(loadTasks)
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

.error-text {
  color: #dc2626;
  font-weight: 600;
}
</style>

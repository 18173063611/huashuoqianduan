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
        <el-form-item label="运维异常">
          <el-checkbox v-model="filters.providerOpsOnly">仅平台异常</el-checkbox>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="filters.providerOpsStatus" clearable placeholder="全部处理状态" style="width: 160px">
            <el-option
              v-for="option in providerOpsStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
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
        <el-table-column label="平台任务/运维" min-width="260">
          <template #default="{ row }">
            <div v-if="row.providerOps" class="provider-ops-cell">
              <div class="provider-ops-line">
                <span class="provider-task-id">{{ row.providerOps.providerTaskId || '未记录平台任务号' }}</span>
                <el-tag size="small" :type="providerStatusTag(row.providerOps.providerStatus)">
                  {{ providerStatusLabel(row.providerOps.providerStatus) }}
                </el-tag>
              </div>
              <div class="provider-ops-meta">
                <span>{{ row.providerOps.canDeleteProviderTask ? '可自动删除' : '不可自动删除' }}</span>
                <span>{{ row.providerOps.manualRetryRequired ? '需人工/供应商处理' : '可系统补偿' }}</span>
                <span v-if="row.providerOps.elapsedSeconds != null">
                  等待 {{ formatDurationSeconds(row.providerOps.elapsedSeconds) }}
                </span>
              </div>
              <div class="provider-ops-meta">
                <el-tag size="small" effect="plain" :type="opsStatusTag(row.providerOps.opsStatus)">
                  {{ providerOpsStatusLabel(row.providerOps.opsStatus) }}
                </el-tag>
                <span v-if="row.providerOps.ticketId">工单 #{{ row.providerOps.ticketId }}</span>
                <span v-if="row.providerOps.supplierTicketId">工单 {{ row.providerOps.supplierTicketId }}</span>
                <span v-if="row.providerOps.slaDeadlineAt">SLA {{ formatDateTime(row.providerOps.slaDeadlineAt) }}</span>
                <span v-if="row.providerOps.retryApprovalStatus && row.providerOps.retryApprovalStatus !== 'NONE'">
                  {{ retryApprovalStatusLabel(row.providerOps.retryApprovalStatus) }}
                </span>
              </div>
            </div>
            <span v-else class="muted-text">—</span>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="100">
          <template #default="{ row }">{{ Number(row.progress ?? 0) }}%</template>
        </el-table-column>
        <el-table-column label="使用模型" min-width="150">
          <template #default="{ row }">{{ compactCode(row.modelCode) }}</template>
        </el-table-column>
        <el-table-column label="用量单位" width="110">
          <template #default="{ row }">{{ formatEmpty(row.usageUnit) }}</template>
        </el-table-column>
        <el-table-column label="预估/实际用量" width="140">
          <template #default="{ row }">{{ formatUsagePair(row.estimatedUsage, row.actualUsage) }}</template>
        </el-table-column>
        <el-table-column label="预扣/实扣" width="130">
          <template #default="{ row }">{{ formatCreditPair(row.estimatedCreditCost ?? row.creditCost, row.actualCreditCost) }}</template>
        </el-table-column>
        <el-table-column label="结算状态" width="120">
          <template #default="{ row }">{{ getSettlementStatusLabel(row.settlementStatus) }}</template>
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
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showTaskDetail(row)">查看详情</el-button>
            <el-button v-if="row.providerOps" link type="primary" @click="openProviderOpsDialog(row)">处理</el-button>
            <el-button
              v-if="row.providerOps?.canManualRetry"
              link
              type="warning"
              @click="openManualRetryDialog(row)"
            >
              {{ row.providerOps?.retryApprovalStatus === 'PENDING' ? '审批重试' : '申请重试' }}
            </el-button>
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

    <el-dialog v-model="opsDialogOpen" title="平台任务运维工单" width="720px">
      <el-form label-width="100px">
        <el-form-item label="任务ID">
          <span>{{ selectedOpsTask?.taskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="平台任务">
          <span>{{ selectedOpsTask?.providerOps?.providerTaskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="工单ID">
          <span>{{ selectedOpsTask?.providerOps?.ticketId ? `#${selectedOpsTask.providerOps.ticketId}` : '保存后生成' }}</span>
        </el-form-item>
        <el-form-item label="处理状态" required>
          <el-select v-model="opsForm.opsStatus" style="width: 100%">
            <el-option
              v-for="option in providerOpsStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="opsForm.priority" style="width: 100%">
            <el-option
              v-for="option in providerOpsPriorityOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input-number v-model="opsForm.assigneeAdminId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="SLA 截止">
          <el-date-picker
            v-model="opsForm.slaDeadlineAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="选择截止时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="供应商工单">
          <el-input v-model="opsForm.supplierTicketId" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="供应商返回">
          <el-input
            v-model="opsForm.supplierResponse"
            type="textarea"
            maxlength="2000"
            :rows="3"
            show-word-limit
            placeholder="记录供应商返回、平台后台查询结果或处理结论"
          />
        </el-form-item>
        <el-form-item label="附件 JSON">
          <el-input
            v-model="opsForm.attachmentJson"
            type="textarea"
            maxlength="2000"
            :rows="2"
            show-word-limit
            placeholder='例如 [{"name":"平台截图","url":"https://..."}]'
          />
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="opsForm.remark"
            type="textarea"
            maxlength="1000"
            :rows="4"
            show-word-limit
            placeholder="记录平台侧核查结果、供应商反馈或内部处理结论"
          />
        </el-form-item>
        <el-form-item v-if="selectedOpsTask?.providerOps?.actions?.length" label="处理历史">
          <div class="provider-ops-history">
            <div
              v-for="action in selectedOpsTask.providerOps.actions"
              :key="action.actionId"
              class="provider-ops-history-item"
            >
              <strong>{{ actionTypeLabel(action.actionType) }}</strong>
              <span>{{ formatDateTime(action.createdAt) }}</span>
              <span v-if="action.operatorAdminId">管理员 {{ action.operatorAdminId }}</span>
              <p v-if="action.remark">{{ action.remark }}</p>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="opsDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="opsSaving" @click="submitProviderOps">保存处理记录</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="manualRetryDialogOpen" :title="manualRetryReviewMode ? '审批人工重试' : '申请人工重试'" width="560px">
      <el-alert
        class="admin-page-alert"
        type="warning"
        show-icon
        :closable="false"
        :title="
          manualRetryReviewMode
            ? '审批通过后会重新入队并可能重新扣费；请确认供应商/平台侧状态。'
            : '这里只提交审批申请，不会立即重新入队。'
        "
      />
      <el-form label-width="112px">
        <el-form-item label="任务ID">
          <span>{{ selectedOpsTask?.taskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="平台任务">
          <span>{{ selectedOpsTask?.providerOps?.providerTaskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="供应商工单">
          <el-input v-model="manualRetryForm.supplierTicketId" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="重试备注" required>
          <el-input
            v-model="manualRetryForm.remark"
            type="textarea"
            maxlength="1000"
            :rows="4"
            show-word-limit
            placeholder="说明为什么可以重试，例如供应商确认任务已终止/不会计费"
          />
        </el-form-item>
        <el-form-item v-if="manualRetryReviewMode" label="确认">
          <el-checkbox v-model="manualRetryForm.confirmProviderResolved">
            已确认平台侧可重试，且接受重新扣费/重新入队结果
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualRetryDialogOpen = false">取消</el-button>
        <template v-if="manualRetryReviewMode">
          <el-button :loading="manualRetrySaving" @click="submitManualRetry(false)">驳回申请</el-button>
          <el-button type="warning" :loading="manualRetrySaving" @click="submitManualRetry(true)">审批通过并重试</el-button>
        </template>
        <el-button v-else type="warning" :loading="manualRetrySaving" @click="submitManualRetryRequest">提交重试申请</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  listAdminTasks,
  requestAdminTaskManualRetry,
  reviewAdminTaskManualRetry,
  updateAdminTaskProviderOps,
} from '../../services/adminApi'
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
const providerOpsStatusOptions = [
  { label: '待处理', value: 'OPEN' },
  { label: '已升级供应商', value: 'ESCALATED' },
  { label: '供应商处理中', value: 'SUPPLIER_PROCESSING' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '忽略', value: 'IGNORED' },
  { label: '重试待审批', value: 'RETRY_PENDING' },
  { label: '重试已投递', value: 'RETRY_DISPATCHED' },
]
const providerOpsPriorityOptions = [
  { label: '低', value: 'LOW' },
  { label: '普通', value: 'NORMAL' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' },
]
const filters = reactive<AdminTaskQuery>({
  ownerUserId: numberFromQuery(route.query.ownerUserId),
  taskType: stringFromQuery(route.query.taskType),
  status: stringFromQuery(route.query.status),
  modelCode: stringFromQuery(route.query.modelCode),
  providerOpsOnly: route.query.providerOpsOnly === 'true',
  providerOpsStatus: stringFromQuery(route.query.providerOpsStatus),
  pageNo: 1,
  pageSize: 10,
})
const records = ref<AdminTaskItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无任务记录'))
const selectedOpsTask = ref<AdminTaskItem | null>(null)
const opsDialogOpen = ref(false)
const opsSaving = ref(false)
const opsForm = reactive({
  opsStatus: 'OPEN',
  priority: 'NORMAL',
  assigneeAdminId: undefined as number | undefined,
  slaDeadlineAt: '',
  supplierTicketId: '',
  supplierResponse: '',
  attachmentJson: '',
  remark: '',
})
const manualRetryDialogOpen = ref(false)
const manualRetrySaving = ref(false)
const manualRetryForm = reactive({
  confirmProviderResolved: false,
  supplierTicketId: '',
  remark: '',
})
const manualRetryReviewMode = computed(() => selectedOpsTask.value?.providerOps?.retryApprovalStatus === 'PENDING')

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
  Object.assign(filters, {
    ownerUserId: undefined,
    taskType: '',
    status: '',
    modelCode: '',
    providerOpsOnly: false,
    providerOpsStatus: '',
    pageNo: 1,
    pageSize: 10,
  })
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
      `供应商：${formatEmpty(row.provider)}`,
      `用量单位：${formatEmpty(row.usageUnit)}`,
      `预估/实际用量：${formatUsagePair(row.estimatedUsage, row.actualUsage)}`,
      `预扣/实扣积分：${formatCreditPair(row.estimatedCreditCost ?? row.creditCost, row.actualCreditCost)}`,
      `结算状态：${getSettlementStatusLabel(row.settlementStatus)}`,
      row.providerOps?.ticketId ? `运维工单：#${row.providerOps.ticketId}` : '',
      row.providerOps ? `平台任务：${row.providerOps.providerTaskId || '—'}` : '',
      row.providerOps ? `平台状态：${providerStatusLabel(row.providerOps.providerStatus)}` : '',
      row.providerOps ? `运维处理：${providerOpsStatusLabel(row.providerOps.opsStatus)}` : '',
      row.providerOps ? `优先级：${providerOpsPriorityLabel(row.providerOps.priority)}` : '',
      row.providerOps?.assigneeAdminId ? `负责人：${row.providerOps.assigneeAdminId}` : '',
      row.providerOps?.slaDeadlineAt ? `SLA：${formatDateTime(row.providerOps.slaDeadlineAt)}` : '',
      row.providerOps?.retryApprovalStatus ? `重试审批：${retryApprovalStatusLabel(row.providerOps.retryApprovalStatus)}` : '',
      row.providerOps?.supplierTicketId ? `供应商工单：${row.providerOps.supplierTicketId}` : '',
      row.providerOps?.remark ? `处理备注：${row.providerOps.remark}` : '',
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
  return Boolean(
    filters.ownerUserId ||
      filters.taskType ||
      filters.status ||
      filters.modelCode ||
      filters.providerOpsOnly ||
      filters.providerOpsStatus,
  )
}

function openProviderOpsDialog(row: AdminTaskItem) {
  selectedOpsTask.value = row
  opsForm.opsStatus = row.providerOps?.opsStatus || 'OPEN'
  opsForm.priority = row.providerOps?.priority || 'NORMAL'
  opsForm.assigneeAdminId = row.providerOps?.assigneeAdminId
  opsForm.slaDeadlineAt = row.providerOps?.slaDeadlineAt || ''
  opsForm.supplierTicketId = row.providerOps?.supplierTicketId || ''
  opsForm.supplierResponse = row.providerOps?.supplierResponse || ''
  opsForm.attachmentJson = row.providerOps?.attachmentJson || ''
  opsForm.remark = row.providerOps?.remark || ''
  opsDialogOpen.value = true
}

async function submitProviderOps() {
  const task = selectedOpsTask.value
  if (!task) return
  opsSaving.value = true
  try {
    await updateAdminTaskProviderOps(task.taskId, {
      opsStatus: opsForm.opsStatus,
      priority: opsForm.priority,
      assigneeAdminId: opsForm.assigneeAdminId,
      slaDeadlineAt: opsForm.slaDeadlineAt || undefined,
      supplierTicketId: opsForm.supplierTicketId.trim() || undefined,
      supplierResponse: opsForm.supplierResponse.trim() || undefined,
      attachmentJson: opsForm.attachmentJson.trim() || undefined,
      remark: opsForm.remark.trim() || undefined,
    })
    ElMessage.success('处理记录已保存')
    opsDialogOpen.value = false
    await loadTasks()
  } finally {
    opsSaving.value = false
  }
}

function openManualRetryDialog(row: AdminTaskItem) {
  selectedOpsTask.value = row
  manualRetryForm.confirmProviderResolved = false
  manualRetryForm.supplierTicketId = row.providerOps?.supplierTicketId || ''
  manualRetryForm.remark =
    row.providerOps?.retryApprovalStatus === 'PENDING'
      ? row.providerOps.retryApprovalRemark || ''
      : ''
  manualRetryDialogOpen.value = true
}

async function submitManualRetryRequest() {
  const task = selectedOpsTask.value
  if (!task) return
  if (!manualRetryForm.remark.trim()) {
    ElMessage.warning('请填写人工重试申请备注')
    return
  }
  manualRetrySaving.value = true
  try {
    await requestAdminTaskManualRetry(task.taskId, {
      supplierTicketId: manualRetryForm.supplierTicketId.trim() || undefined,
      remark: manualRetryForm.remark.trim(),
    })
    ElMessage.success('人工重试申请已提交')
    manualRetryDialogOpen.value = false
    await loadTasks()
  } finally {
    manualRetrySaving.value = false
  }
}

async function submitManualRetry(approved: boolean) {
  const task = selectedOpsTask.value
  if (!task) return
  if (approved && !manualRetryForm.confirmProviderResolved) {
    ElMessage.warning('请先确认平台侧可重试')
    return
  }
  if (!manualRetryForm.remark.trim()) {
    ElMessage.warning('请填写审批备注')
    return
  }
  manualRetrySaving.value = true
  try {
    await reviewAdminTaskManualRetry(task.taskId, {
      approved,
      confirmProviderResolved: manualRetryForm.confirmProviderResolved,
      supplierTicketId: manualRetryForm.supplierTicketId.trim() || undefined,
      remark: manualRetryForm.remark.trim(),
    })
    ElMessage.success(approved ? '审批通过，任务已提交重试' : '人工重试申请已驳回')
    manualRetryDialogOpen.value = false
    await loadTasks()
  } finally {
    manualRetrySaving.value = false
  }
}

function formatUsagePair(estimated?: number | null, actual?: number | null) {
  return `${formatNumber(estimated)} / ${formatNumber(actual)}`
}

function formatCreditPair(estimated?: number | null, actual?: number | null) {
  return `${formatCreditAmount(estimated)} / ${formatCreditAmount(actual)}`
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString()
}

function getSettlementStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    NONE: '未计费',
    PRECHARGED: '已预扣',
    SETTLED: '已结算',
    REFUNDED: '已全退',
    PARTIAL_REFUNDED: '已退差额',
    SETTLE_FAILED: '结算失败',
  }
  return status ? map[status] || status : '—'
}

function providerStatusLabel(status?: string | null) {
  const raw = String(status || '').toLowerCase()
  const map: Record<string, string> = {
    queued: '平台排队',
    running: '平台运行中',
    succeeded: '平台已完成',
    success: '平台已完成',
    failed: '平台失败',
    cancelled: '平台已取消',
    canceled: '平台已取消',
    expired: '平台已过期',
    unknown: '未知',
  }
  return map[raw] || status || '未知'
}

function providerStatusTag(status?: string | null) {
  const raw = String(status || '').toLowerCase()
  if (raw === 'running') return 'warning'
  if (raw === 'queued') return 'info'
  if (raw === 'succeeded' || raw === 'success') return 'success'
  if (raw === 'failed' || raw === 'expired') return 'danger'
  return 'info'
}

function providerOpsStatusLabel(status?: string | null) {
  const raw = String(status || '').toUpperCase()
  const found = providerOpsStatusOptions.find((item) => item.value === raw)
  return found?.label || '待处理'
}

function providerOpsPriorityLabel(priority?: string | null) {
  const raw = String(priority || '').toUpperCase()
  const found = providerOpsPriorityOptions.find((item) => item.value === raw)
  return found?.label || '普通'
}

function retryApprovalStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    NONE: '未申请重试',
    PENDING: '重试待审批',
    APPROVED: '重试已批准',
    REJECTED: '重试已驳回',
    DISPATCHED: '重试已投递',
  }
  const raw = String(status || 'NONE').toUpperCase()
  return map[raw] || raw
}

function actionTypeLabel(actionType?: string | null) {
  const map: Record<string, string> = {
    CREATE: '创建工单',
    UPDATE: '更新处理',
    RETRY_REQUEST: '申请重试',
    RETRY_APPROVE: '批准重试',
    RETRY_REJECT: '驳回重试',
    RETRY_DISPATCH: '投递重试',
  }
  const raw = String(actionType || '').toUpperCase()
  return map[raw] || raw || '处理记录'
}

function opsStatusTag(status?: string | null) {
  const raw = String(status || '').toUpperCase()
  if (raw === 'RESOLVED') return 'success'
  if (raw === 'IGNORED') return 'info'
  if (raw === 'ESCALATED' || raw === 'SUPPLIER_PROCESSING' || raw === 'RETRY_PENDING' || raw === 'RETRY_DISPATCHED') return 'warning'
  return 'danger'
}

function formatDurationSeconds(seconds?: number | null) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) {
    return '—'
  }
  const whole = Math.max(0, Math.floor(Number(seconds)))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  if (hours > 0) return `${hours}小时${minutes}分`
  if (minutes > 0) return `${minutes}分${rest}秒`
  return `${rest}秒`
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

.muted-text {
  color: #9ca3af;
}

.provider-ops-cell {
  display: grid;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.provider-ops-line,
.provider-ops-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}

.provider-task-id {
  max-width: 190px;
  overflow-wrap: anywhere;
  color: #111827;
  font-weight: 700;
}

.provider-ops-meta {
  color: #6b7280;
}

.provider-ops-history {
  display: grid;
  width: 100%;
  max-height: 220px;
  overflow: auto;
  gap: 8px;
}

.provider-ops-history-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  padding: 8px 10px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.5;
}

.provider-ops-history-item strong {
  margin-right: 8px;
  color: #111827;
}

.provider-ops-history-item span {
  margin-right: 8px;
}

.provider-ops-history-item p {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}
</style>

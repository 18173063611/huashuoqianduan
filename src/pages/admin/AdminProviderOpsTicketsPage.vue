<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>运维工单处理台</h2>
        <p>按平台任务异常、SLA、负责人和供应商处理状态集中推进工单闭环。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadTickets">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="处理状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 160px">
            <el-option
              v-for="option in providerOpsStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部优先级" style="width: 140px">
            <el-option
              v-for="option in providerOpsPriorityOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input-number
            v-model="filters.assigneeAdminId"
            :min="1"
            :precision="0"
            controls-position="right"
            placeholder="管理员ID"
          />
        </el-form-item>
        <el-form-item label="SLA">
          <el-checkbox v-model="filters.overdueOnly">只看逾期</el-checkbox>
        </el-form-item>
        <el-form-item label="平台任务">
          <el-input v-model="filters.providerTaskId" clearable placeholder="providerTaskId" style="width: 220px" />
        </el-form-item>
        <el-form-item label="供应商工单">
          <el-input v-model="filters.supplierTicketId" clearable placeholder="供应商工单号" style="width: 180px" />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="filters.taskType" clearable placeholder="全部任务类型" style="width: 170px">
            <el-option label="汽车销售成片" value="SEEDANCE_CAR_SALES_VIDEO" />
            <el-option label="视频生成" value="SEEDANCE_TEXT_VIDEO" />
            <el-option label="数字人生成" value="DIGITAL_HUMAN_GENERATE" />
            <el-option label="语音合成" value="TTS_GENERATE" />
            <el-option label="形象生成" value="AVATAR_GENERATE" />
          </el-select>
        </el-form-item>
        <el-form-item label="重试审批">
          <el-select v-model="filters.retryApprovalStatus" clearable placeholder="全部审批状态" style="width: 160px">
            <el-option
              v-for="option in retryApprovalStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="ticketId" border :empty-text="emptyText">
        <el-table-column label="工单" width="115">
          <template #default="{ row }">
            <div class="ticket-id">#{{ row.ticketId }}</div>
            <div class="muted-text">任务 {{ row.taskId }}</div>
          </template>
        </el-table-column>
        <el-table-column label="任务信息" min-width="180">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong>{{ getTaskTypeLabel(row.taskType) }}</strong>
              <span>用户 {{ formatEmpty(row.ownerUserId) }}</span>
              <span>
                <el-tag size="small" :type="getTagTypeByStatus(row.taskStatus)">
                  {{ getTaskStatusLabel(row.taskStatus) }}
                </el-tag>
                <span class="inline-muted">{{ compactCode(row.modelCode) }}</span>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="平台任务" min-width="260">
          <template #default="{ row }">
            <div class="stack-cell">
              <strong class="provider-task-id">{{ row.providerTaskId || '未记录平台任务号' }}</strong>
              <span>
                <el-tag size="small" :type="providerStatusTag(row.providerStatus)">
                  {{ providerStatusLabel(row.providerStatus) }}
                </el-tag>
                <span class="inline-muted">{{ row.canDeleteProviderTask ? '可自动删除' : '不可自动删除' }}</span>
              </span>
              <span v-if="row.alertElapsedSeconds != null">
                等待 {{ formatDurationSeconds(row.alertElapsedSeconds) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="处理状态" min-width="170">
          <template #default="{ row }">
            <div class="stack-cell">
              <span>
                <el-tag size="small" effect="plain" :type="opsStatusTag(row.opsStatus)">
                  {{ providerOpsStatusLabel(row.opsStatus) }}
                </el-tag>
                <el-tag v-if="row.slaOverdue" class="ml-6" size="small" type="danger">SLA逾期</el-tag>
              </span>
              <span>
                <el-tag size="small" :type="priorityTag(row.priority)">{{ providerOpsPriorityLabel(row.priority) }}</el-tag>
                <span class="inline-muted">负责人 {{ formatEmpty(row.assigneeAdminId) }}</span>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="SLA/供应商" min-width="230">
          <template #default="{ row }">
            <div class="stack-cell">
              <span>SLA {{ formatDateTime(row.slaDeadlineAt) }}</span>
              <span>供应商工单 {{ formatEmpty(row.supplierTicketId) }}</span>
              <span>{{ retryApprovalStatusLabel(row.retryApprovalStatus) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最近备注" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'error-text': row.slaOverdue }">{{ formatEmpty(row.remark || row.errorMessage) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="245" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showTicketDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openTicketDialog(row)">处理</el-button>
            <el-button
              v-if="row.canManualRetry"
              link
              type="warning"
              @click="openRetryDialog(row)"
            >
              {{ row.retryApprovalStatus === 'PENDING' ? '审批重试' : '申请重试' }}
            </el-button>
            <el-button link @click="openTaskCenter(row)">任务页</el-button>
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
        @size-change="loadTickets"
        @current-change="loadTickets"
      />
    </el-card>

    <el-dialog v-model="ticketDialogOpen" title="处理运维工单" width="720px">
      <el-form label-width="104px">
        <el-form-item label="工单ID">
          <span>#{{ selectedTicket?.ticketId || '—' }}</span>
        </el-form-item>
        <el-form-item label="任务ID">
          <span>{{ selectedTicket?.taskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="平台任务">
          <span>{{ selectedTicket?.providerTaskId || '—' }}</span>
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
        <el-form-item v-if="selectedTicket?.actions?.length" label="处理历史">
          <div class="provider-ops-history">
            <div
              v-for="action in selectedTicket.actions"
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
        <el-button @click="ticketDialogOpen = false">取消</el-button>
        <el-button type="primary" :loading="opsSaving" @click="submitTicketUpdate">保存处理记录</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="retryDialogOpen" :title="retryReviewMode ? '审批人工重试' : '申请人工重试'" width="560px">
      <el-alert
        class="admin-page-alert"
        type="warning"
        show-icon
        :closable="false"
        :title="
          retryReviewMode
            ? '审批通过后会重新入队；请确认供应商/平台侧状态。'
            : '这里只提交审批申请，不会立即重新入队。'
        "
      />
      <el-form label-width="112px">
        <el-form-item label="工单ID">
          <span>#{{ selectedTicket?.ticketId || '—' }}</span>
        </el-form-item>
        <el-form-item label="任务ID">
          <span>{{ selectedTicket?.taskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="平台任务">
          <span>{{ selectedTicket?.providerTaskId || '—' }}</span>
        </el-form-item>
        <el-form-item label="供应商工单">
          <el-input v-model="retryForm.supplierTicketId" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="重试备注" required>
          <el-input
            v-model="retryForm.remark"
            type="textarea"
            maxlength="1000"
            :rows="4"
            show-word-limit
            placeholder="说明为什么可以重试，例如供应商确认任务已终止/不会计费"
          />
        </el-form-item>
        <el-form-item v-if="retryReviewMode" label="确认">
          <el-checkbox v-model="retryForm.confirmProviderResolved">
            已确认平台侧可重试，并接受重新扣费/重新入队结果
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="retryDialogOpen = false">取消</el-button>
        <template v-if="retryReviewMode">
          <el-button :loading="retrySaving" @click="submitRetryReview(false)">驳回申请</el-button>
          <el-button type="warning" :loading="retrySaving" @click="submitRetryReview(true)">审批通过并重试</el-button>
        </template>
        <el-button v-else type="warning" :loading="retrySaving" @click="submitRetryRequest">提交重试申请</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  listAdminProviderOpsTickets,
  requestAdminProviderOpsTicketRetry,
  reviewAdminProviderOpsTicketRetry,
  updateAdminProviderOpsTicket,
} from '../../services/adminApi'
import type { AdminProviderOpsTicketItem, AdminProviderOpsTicketQuery } from '../../types/adminTypes'
import {
  compactCode,
  formatDateTime,
  formatEmpty,
  getEmptyText,
  getTagTypeByStatus,
  getTaskStatusLabel,
  getTaskTypeLabel,
} from '../../utils/adminDisplay'

const route = useRoute()
const router = useRouter()

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

const retryApprovalStatusOptions = [
  { label: '未申请', value: 'NONE' },
  { label: '待审批', value: 'PENDING' },
  { label: '已批准', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已投递', value: 'DISPATCHED' },
]

const filters = reactive<AdminProviderOpsTicketQuery>({
  status: stringFromQuery(route.query.status),
  priority: stringFromQuery(route.query.priority),
  assigneeAdminId: numberFromQuery(route.query.assigneeAdminId),
  overdueOnly: route.query.overdueOnly === 'true',
  supplierTicketId: stringFromQuery(route.query.supplierTicketId),
  providerTaskId: stringFromQuery(route.query.providerTaskId),
  taskType: stringFromQuery(route.query.taskType),
  retryApprovalStatus: stringFromQuery(route.query.retryApprovalStatus),
  pageNo: 1,
  pageSize: 10,
})

const records = ref<AdminProviderOpsTicketItem[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无运维工单'))

const selectedTicket = ref<AdminProviderOpsTicketItem | null>(null)
const ticketDialogOpen = ref(false)
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

const retryDialogOpen = ref(false)
const retrySaving = ref(false)
const retryForm = reactive({
  confirmProviderResolved: false,
  supplierTicketId: '',
  remark: '',
})
const retryReviewMode = computed(() => selectedTicket.value?.retryApprovalStatus === 'PENDING')

async function loadTickets() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminProviderOpsTickets(filters)
    records.value = page.records
    total.value = page.total
  } catch (unknownError) {
    records.value = []
    total.value = 0
    error.value = unknownError instanceof Error ? unknownError.message : '运维工单接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadTickets()
}

function resetFilters() {
  Object.assign(filters, {
    status: '',
    priority: '',
    assigneeAdminId: undefined,
    overdueOnly: false,
    supplierTicketId: '',
    providerTaskId: '',
    taskType: '',
    retryApprovalStatus: '',
    pageNo: 1,
    pageSize: 10,
  })
  void loadTickets()
}

function showTicketDetail(row: AdminProviderOpsTicketItem) {
  ElMessageBox.alert(
    [
      `工单ID：#${row.ticketId}`,
      `任务ID：${row.taskId}`,
      `用户ID：${formatEmpty(row.ownerUserId)}`,
      `任务类型：${getTaskTypeLabel(row.taskType)}`,
      `任务状态：${getTaskStatusLabel(row.taskStatus)}`,
      `平台任务：${formatEmpty(row.providerTaskId)}`,
      `平台状态：${providerStatusLabel(row.providerStatus)}`,
      `处理状态：${providerOpsStatusLabel(row.opsStatus)}`,
      `优先级：${providerOpsPriorityLabel(row.priority)}`,
      `负责人：${formatEmpty(row.assigneeAdminId)}`,
      `SLA：${formatDateTime(row.slaDeadlineAt)}`,
      `SLA状态：${row.slaOverdue ? '已逾期' : '未逾期'}`,
      `供应商工单：${formatEmpty(row.supplierTicketId)}`,
      `重试审批：${retryApprovalStatusLabel(row.retryApprovalStatus)}`,
      row.supplierResponse ? `供应商返回：${row.supplierResponse}` : '',
      row.remark ? `处理备注：${row.remark}` : '',
      row.errorMessage ? `任务错误：${row.errorMessage}` : '',
      `更新时间：${formatDateTime(row.updatedAt)}`,
    ]
      .filter(Boolean)
      .join('\n'),
    '运维工单详情',
    { confirmButtonText: '知道了' },
  )
}

function openTicketDialog(row: AdminProviderOpsTicketItem) {
  selectedTicket.value = row
  opsForm.opsStatus = row.opsStatus || 'OPEN'
  opsForm.priority = row.priority || 'NORMAL'
  opsForm.assigneeAdminId = row.assigneeAdminId
  opsForm.slaDeadlineAt = row.slaDeadlineAt || ''
  opsForm.supplierTicketId = row.supplierTicketId || ''
  opsForm.supplierResponse = row.supplierResponse || ''
  opsForm.attachmentJson = row.attachmentJson || ''
  opsForm.remark = row.remark || ''
  ticketDialogOpen.value = true
}

async function submitTicketUpdate() {
  const ticket = selectedTicket.value
  if (!ticket) return
  opsSaving.value = true
  try {
    await updateAdminProviderOpsTicket(ticket.ticketId, {
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
    ticketDialogOpen.value = false
    await loadTickets()
  } finally {
    opsSaving.value = false
  }
}

function openRetryDialog(row: AdminProviderOpsTicketItem) {
  selectedTicket.value = row
  retryForm.confirmProviderResolved = false
  retryForm.supplierTicketId = row.supplierTicketId || ''
  retryForm.remark = row.retryApprovalStatus === 'PENDING' ? row.retryApprovalRemark || '' : ''
  retryDialogOpen.value = true
}

async function submitRetryRequest() {
  const ticket = selectedTicket.value
  if (!ticket) return
  if (!retryForm.remark.trim()) {
    ElMessage.warning('请填写人工重试申请备注')
    return
  }
  retrySaving.value = true
  try {
    await requestAdminProviderOpsTicketRetry(ticket.ticketId, {
      supplierTicketId: retryForm.supplierTicketId.trim() || undefined,
      remark: retryForm.remark.trim(),
    })
    ElMessage.success('人工重试申请已提交')
    retryDialogOpen.value = false
    await loadTickets()
  } finally {
    retrySaving.value = false
  }
}

async function submitRetryReview(approved: boolean) {
  const ticket = selectedTicket.value
  if (!ticket) return
  if (approved && !retryForm.confirmProviderResolved) {
    ElMessage.warning('请先确认平台侧可重试')
    return
  }
  if (!retryForm.remark.trim()) {
    ElMessage.warning('请填写审批备注')
    return
  }
  retrySaving.value = true
  try {
    await reviewAdminProviderOpsTicketRetry(ticket.ticketId, {
      approved,
      confirmProviderResolved: retryForm.confirmProviderResolved,
      supplierTicketId: retryForm.supplierTicketId.trim() || undefined,
      remark: retryForm.remark.trim(),
    })
    ElMessage.success(approved ? '审批通过，任务已提交重试' : '人工重试申请已驳回')
    retryDialogOpen.value = false
    await loadTickets()
  } finally {
    retrySaving.value = false
  }
}

function openTaskCenter(row: AdminProviderOpsTicketItem) {
  void router.push({
    path: '/admin/tasks',
    query: {
      providerOpsOnly: 'true',
      providerOpsStatus: row.opsStatus || undefined,
    },
  })
}

function hasFilter() {
  return Boolean(
    filters.status ||
      filters.priority ||
      filters.assigneeAdminId ||
      filters.overdueOnly ||
      filters.supplierTicketId ||
      filters.providerTaskId ||
      filters.taskType ||
      filters.retryApprovalStatus,
  )
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
  const raw = String(status || 'NONE').toUpperCase()
  const found = retryApprovalStatusOptions.find((item) => item.value === raw)
  return found?.label || raw
}

function opsStatusTag(status?: string | null) {
  const raw = String(status || '').toUpperCase()
  if (raw === 'RESOLVED') return 'success'
  if (raw === 'IGNORED') return 'info'
  if (raw === 'ESCALATED' || raw === 'SUPPLIER_PROCESSING' || raw === 'RETRY_PENDING' || raw === 'RETRY_DISPATCHED') {
    return 'warning'
  }
  return 'danger'
}

function priorityTag(priority?: string | null) {
  const raw = String(priority || '').toUpperCase()
  if (raw === 'URGENT') return 'danger'
  if (raw === 'HIGH') return 'warning'
  if (raw === 'LOW') return 'info'
  return 'primary'
}

function actionTypeLabel(actionType?: string | null) {
  const map: Record<string, string> = {
    CREATE: '创建工单',
    UPDATE: '更新处理',
    RETRY_REQUEST: '申请重试',
    RETRY_APPROVE: '批准重试',
    RETRY_REJECT: '驳回重试',
    RETRY_DISPATCH: '投递重试',
    SLA_OVERDUE: 'SLA逾期',
  }
  const raw = String(actionType || '').toUpperCase()
  return map[raw] || raw || '处理记录'
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

onMounted(loadTickets)
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

.ticket-id,
.provider-task-id {
  color: #111827;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.stack-cell {
  display: grid;
  gap: 6px;
  color: #4b5563;
  font-size: 12px;
  line-height: 1.4;
}

.stack-cell strong {
  color: #111827;
}

.inline-muted,
.muted-text {
  color: #6b7280;
}

.inline-muted {
  margin-left: 6px;
}

.ml-6 {
  margin-left: 6px;
}

.error-text {
  color: #dc2626;
  font-weight: 600;
}

.provider-ops-history {
  display: grid;
  width: 100%;
  max-height: 240px;
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

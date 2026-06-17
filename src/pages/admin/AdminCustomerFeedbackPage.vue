<template>
  <section class="admin-page">
    <div class="page-heading">
      <div>
        <h2>客服工单</h2>
        <p>查看内测与推广用户提交的问题、建议、任务异常和投诉。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="loadFeedback">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form class="admin-filter" :model="filters" inline>
        <el-form-item label="用户ID">
          <el-input-number v-model="filters.ownerUserId" :min="1" :precision="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.category" clearable placeholder="全部类型" style="width: 140px">
            <el-option label="任务异常" value="TASK_EXCEPTION" />
            <el-option label="产品问题" value="BUG" />
            <el-option label="功能建议" value="FEATURE_REQUEST" />
            <el-option label="使用咨询" value="CONSULT" />
            <el-option label="内容投诉" value="CONTENT_COMPLAINT" />
            <el-option label="退款/计费" value="REFUND" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 130px">
            <el-option label="待处理" value="OPEN" />
            <el-option label="处理中" value="IN_PROGRESS" />
            <el-option label="待补充" value="WAITING_USER" />
            <el-option label="已解决" value="RESOLVED" />
            <el-option label="已关闭" value="CLOSED" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" clearable placeholder="全部优先级" style="width: 130px">
            <el-option label="紧急" value="URGENT" />
            <el-option label="较高" value="HIGH" />
            <el-option label="普通" value="NORMAL" />
            <el-option label="较低" value="LOW" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="标题/内容/联系方式" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert v-if="error" class="admin-page-alert" :title="error" type="warning" show-icon :closable="false" />

      <el-table v-loading="loading" :data="records" row-key="feedbackId" border :empty-text="emptyText">
        <el-table-column prop="feedbackId" label="ID" width="86" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="96">
          <template #default="{ row }">
            <el-tag :type="priorityTagType(row.priority)" effect="plain">{{ priorityLabel(row.priority) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="130">
          <template #default="{ row }">
            <span>{{ row.displayName || row.username || `用户 ${row.ownerUserId}` }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标题/内容" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <strong class="feedback-title">{{ row.title }}</strong>
            <span class="feedback-content">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关联任务" width="105">
          <template #default="{ row }">{{ row.relatedTaskId || '—' }}</template>
        </el-table-column>
        <el-table-column label="附件" width="80">
          <template #default="{ row }">{{ row.attachments?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="165">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="112" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openDetail(row)">处理</el-button>
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
        @size-change="loadFeedback"
        @current-change="loadFeedback"
      />
    </el-card>

    <el-drawer v-model="drawerOpen" title="工单处理" size="520px" :destroy-on-close="false">
      <div v-if="selected" class="feedback-detail">
        <section class="feedback-detail-section">
          <div class="feedback-detail-title">
            <strong>#{{ selected.feedbackId }} {{ selected.title }}</strong>
            <el-tag :type="statusTagType(selected.status)" effect="light">{{ statusLabel(selected.status) }}</el-tag>
          </div>
          <p>{{ selected.content }}</p>
          <dl class="feedback-meta">
            <div>
              <dt>用户</dt>
              <dd>{{ selected.displayName || selected.username || `用户 ${selected.ownerUserId}` }}</dd>
            </div>
            <div>
              <dt>联系方式</dt>
              <dd>{{ selected.contact || '—' }}</dd>
            </div>
            <div>
              <dt>关联任务</dt>
              <dd>{{ selected.relatedTaskId || '—' }}</dd>
            </div>
            <div>
              <dt>提交页面</dt>
              <dd>
                <a v-if="selected.pageUrl" :href="selected.pageUrl" target="_blank" rel="noreferrer">
                  {{ selected.sourcePath || selected.pageUrl }}
                </a>
                <span v-else>—</span>
              </dd>
            </div>
          </dl>
        </section>

        <section v-if="selected.attachments?.length" class="feedback-detail-section">
          <h3>附件</h3>
          <div class="feedback-attachments">
            <a
              v-for="file in selected.attachments"
              :key="file.fileId"
              class="feedback-attachment"
              :href="file.previewUrl"
              target="_blank"
              rel="noreferrer"
            >
              <span>{{ file.originalFileName }}</span>
              <small>{{ formatFileSize(file.fileSize) }}</small>
            </a>
          </div>
        </section>

        <el-form class="feedback-handle-form" label-position="top">
          <div class="feedback-grid">
            <el-form-item label="处理状态">
              <el-select v-model="handleForm.status">
                <el-option label="待处理" value="OPEN" />
                <el-option label="处理中" value="IN_PROGRESS" />
                <el-option label="待用户补充" value="WAITING_USER" />
                <el-option label="已解决" value="RESOLVED" />
                <el-option label="已关闭" value="CLOSED" />
              </el-select>
            </el-form-item>
            <el-form-item label="优先级">
              <el-select v-model="handleForm.priority">
                <el-option label="紧急" value="URGENT" />
                <el-option label="较高" value="HIGH" />
                <el-option label="普通" value="NORMAL" />
                <el-option label="较低" value="LOW" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="用户可见回复">
            <el-input v-model="handleForm.adminReply" type="textarea" :rows="4" maxlength="4000" show-word-limit />
          </el-form-item>
          <el-form-item label="内部备注">
            <el-input v-model="handleForm.adminNote" type="textarea" :rows="4" maxlength="4000" show-word-limit />
          </el-form-item>
          <div class="feedback-drawer-actions">
            <el-button @click="drawerOpen = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveFeedback">保存处理</el-button>
          </div>
        </el-form>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, View } from '@element-plus/icons-vue'
import { getAdminFeedback, listAdminFeedback, updateAdminFeedback } from '../../services/adminApi'
import type {
  CustomerFeedbackAdminQuery,
  CustomerFeedbackCategory,
  CustomerFeedbackItem,
  CustomerFeedbackPriority,
  CustomerFeedbackStatus,
} from '../../types/feedbackTypes'
import { formatDateTime, getEmptyText } from '../../utils/adminDisplay'

const filters = reactive<CustomerFeedbackAdminQuery>({
  ownerUserId: undefined,
  category: '',
  status: '',
  priority: '',
  keyword: '',
  pageNo: 1,
  pageSize: 10,
})

const handleForm = reactive<{
  status: CustomerFeedbackStatus
  priority: CustomerFeedbackPriority
  adminReply: string
  adminNote: string
}>({
  status: 'OPEN',
  priority: 'NORMAL',
  adminReply: '',
  adminNote: '',
})

const records = ref<CustomerFeedbackItem[]>([])
const selected = ref<CustomerFeedbackItem | null>(null)
const drawerOpen = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const total = ref(0)
const emptyText = computed(() => getEmptyText(loading.value, total.value, hasFilter(), '暂无客服工单'))

async function loadFeedback() {
  loading.value = true
  error.value = ''
  try {
    const page = await listAdminFeedback(filters)
    records.value = page.records
    total.value = page.total
  } catch (unknownError) {
    records.value = []
    total.value = 0
    error.value = unknownError instanceof Error ? unknownError.message : '客服工单接口请求失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  filters.pageNo = 1
  void loadFeedback()
}

function resetFilters() {
  Object.assign(filters, {
    ownerUserId: undefined,
    category: '',
    status: '',
    priority: '',
    keyword: '',
    pageNo: 1,
    pageSize: 10,
  })
  void loadFeedback()
}

async function openDetail(row: CustomerFeedbackItem) {
  drawerOpen.value = true
  selected.value = row
  fillHandleForm(row)
  try {
    const detail = await getAdminFeedback(row.feedbackId)
    selected.value = detail
    fillHandleForm(detail)
  } catch (unknownError) {
    ElMessage.warning(unknownError instanceof Error ? unknownError.message : '工单详情加载失败')
  }
}

async function saveFeedback() {
  if (!selected.value || saving.value) return
  saving.value = true
  try {
    const updated = await updateAdminFeedback(selected.value.feedbackId, {
      status: handleForm.status,
      priority: handleForm.priority,
      adminReply: handleForm.adminReply,
      adminNote: handleForm.adminNote,
    })
    selected.value = updated
    fillHandleForm(updated)
    ElMessage.success('工单已更新')
    await loadFeedback()
  } catch (unknownError) {
    ElMessage.error(unknownError instanceof Error ? unknownError.message : '工单更新失败')
  } finally {
    saving.value = false
  }
}

function fillHandleForm(item: CustomerFeedbackItem) {
  handleForm.status = item.status
  handleForm.priority = item.priority
  handleForm.adminReply = item.adminReply || ''
  handleForm.adminNote = item.adminNote || ''
}

function hasFilter() {
  return Boolean(filters.ownerUserId || filters.category || filters.status || filters.priority || filters.keyword)
}

function categoryLabel(category: CustomerFeedbackCategory) {
  const map: Record<CustomerFeedbackCategory, string> = {
    BUG: '产品问题',
    TASK_EXCEPTION: '任务异常',
    FEATURE_REQUEST: '功能建议',
    CONSULT: '使用咨询',
    CONTENT_COMPLAINT: '内容投诉',
    REFUND: '退款/计费',
    OTHER: '其他',
  }
  return map[category] || category
}

function priorityLabel(priority: CustomerFeedbackPriority) {
  const map: Record<CustomerFeedbackPriority, string> = {
    LOW: '较低',
    NORMAL: '普通',
    HIGH: '较高',
    URGENT: '紧急',
  }
  return map[priority] || priority
}

function priorityTagType(priority: CustomerFeedbackPriority) {
  if (priority === 'URGENT') return 'danger'
  if (priority === 'HIGH') return 'warning'
  if (priority === 'LOW') return 'info'
  return 'primary'
}

function statusLabel(status: CustomerFeedbackStatus) {
  const map: Record<CustomerFeedbackStatus, string> = {
    OPEN: '待处理',
    IN_PROGRESS: '处理中',
    WAITING_USER: '待补充',
    RESOLVED: '已解决',
    CLOSED: '已关闭',
  }
  return map[status] || status
}

function statusTagType(status: CustomerFeedbackStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success'
  if (status === 'WAITING_USER') return 'warning'
  if (status === 'IN_PROGRESS') return 'primary'
  return 'info'
}

function formatFileSize(size?: number | null) {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(loadFeedback)
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

.feedback-title,
.feedback-content {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-title {
  color: var(--hs-text);
}

.feedback-content {
  margin-top: 3px;
  color: var(--hs-text-muted);
  font-size: 12px;
}

.feedback-detail {
  display: grid;
  gap: 16px;
}

.feedback-detail-section,
.feedback-handle-form {
  display: grid;
  gap: 12px;
}

.feedback-detail-section {
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.feedback-detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feedback-detail-title strong {
  min-width: 0;
  color: var(--hs-text);
  line-height: 1.45;
}

.feedback-detail-section p {
  margin: 0;
  color: var(--hs-text-muted);
  line-height: 1.65;
  white-space: pre-wrap;
}

.feedback-detail-section h3 {
  margin: 0;
  color: var(--hs-text);
  font-size: 15px;
}

.feedback-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.feedback-meta div {
  min-width: 0;
}

.feedback-meta dt {
  color: var(--hs-text-soft);
  font-size: 12px;
}

.feedback-meta dd {
  min-width: 0;
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--hs-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-meta a {
  color: var(--hs-primary);
}

.feedback-attachments {
  display: grid;
  gap: 8px;
}

.feedback-attachment {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  background: #f8fafc;
  color: var(--hs-primary);
  padding: 0 10px;
  text-decoration: none;
}

.feedback-attachment span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-attachment small {
  flex: 0 0 auto;
  color: var(--hs-text-muted);
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.feedback-drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 900px) {
  .page-heading {
    grid-template-columns: 1fr;
  }
}
</style>

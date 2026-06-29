<template>
  <div class="feedback-panel" @paste="handlePaste">
    <el-alert
      v-if="error"
      class="feedback-alert"
      :title="error"
      type="warning"
      show-icon
      :closable="false"
    />

    <el-form class="feedback-form" label-position="top" @submit.prevent="submitFeedback">
      <div class="feedback-grid">
        <el-form-item label="反馈类型">
          <el-select v-model="form.category" placeholder="选择类型">
            <el-option label="任务异常" value="TASK_EXCEPTION" />
            <el-option label="产品问题" value="BUG" />
            <el-option label="功能建议" value="FEATURE_REQUEST" />
            <el-option label="使用咨询" value="CONSULT" />
            <el-option label="内容投诉" value="CONTENT_COMPLAINT" />
            <el-option label="退款/计费" value="REFUND" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="form.priority" placeholder="选择程度">
            <el-option label="普通" value="NORMAL" />
            <el-option label="较高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
            <el-option label="较低" value="LOW" />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="标题">
        <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="一句话说明问题" />
      </el-form-item>

      <el-form-item label="反馈内容">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="5"
          maxlength="4000"
          show-word-limit
          placeholder="发生了什么、期望结果是什么"
        />
      </el-form-item>

      <div class="feedback-grid">
        <el-form-item label="关联任务ID">
          <el-input-number
            v-model="form.relatedTaskId"
            class="feedback-number"
            :min="1"
            :precision="0"
            controls-position="right"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="form.contact" maxlength="120" placeholder="手机号/微信/邮箱，可选" />
        </el-form-item>
      </div>

      <div class="feedback-upload-row">
        <input
          ref="fileInputRef"
          class="feedback-file-input"
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.ppt,.pptx"
          @change="handleFileChange"
        />
        <el-button :icon="Paperclip" :loading="uploading" @click="openFilePicker">添加附件</el-button>
        <span class="feedback-upload-count">{{ attachments.length }}/8</span>
      </div>

      <div v-if="attachments.length" class="feedback-attachments">
        <div v-for="file in attachments" :key="file.fileId" class="feedback-attachment">
          <a
            v-if="isImageAttachment(file)"
            class="feedback-attachment-thumb"
            :href="file.previewUrl"
            target="_blank"
            rel="noreferrer"
          >
            <img :src="file.previewUrl" :alt="file.originalFileName" loading="lazy" />
          </a>
          <div class="feedback-attachment-main">
            <a :href="file.previewUrl" target="_blank" rel="noreferrer">{{ file.originalFileName }}</a>
            <span>{{ formatFileSize(file.fileSize) }}</span>
          </div>
          <button type="button" class="feedback-attachment-remove" @click="removeAttachment(file.fileId)">
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>

      <div class="feedback-submit-row">
        <el-button type="primary" :icon="Promotion" :loading="submitting" @click="submitFeedback">提交反馈</el-button>
      </div>
    </el-form>

    <section class="feedback-history">
      <div class="feedback-history-head">
        <h3>最近反馈</h3>
        <el-button link :icon="Refresh" :loading="historyLoading" @click="loadHistory">刷新</el-button>
      </div>

      <div v-if="!history.length && !historyLoading" class="feedback-empty">暂无反馈记录</div>
      <article v-for="item in history" :key="item.feedbackId" class="feedback-history-item">
        <div class="feedback-history-title">
          <strong>#{{ item.feedbackId }} {{ item.title }}</strong>
          <el-tag :type="statusTagType(item.status)" effect="light">{{ statusLabel(item.status) }}</el-tag>
        </div>
        <p>{{ item.adminReply || item.content }}</p>
        <div v-if="imageAttachments(item.attachments).length" class="feedback-history-images">
          <a
            v-for="file in imageAttachments(item.attachments)"
            :key="file.fileId"
            :href="file.previewUrl"
            target="_blank"
            rel="noreferrer"
          >
            <img :src="file.previewUrl" :alt="file.originalFileName" loading="lazy" />
          </a>
        </div>
        <div class="feedback-history-meta">
          <span>{{ categoryLabel(item.category) }}</span>
          <span>{{ formatDateTime(item.createdAt) }}</span>
          <span v-if="item.attachments?.length">{{ item.attachments.length }} 个附件</span>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Paperclip, Promotion, Refresh } from '@element-plus/icons-vue'
import { createFeedback, listMyFeedback } from '../services/feedbackApi'
import { uploadFile } from '../services/uploadApi'
import type { UploadedFileItem } from '../types/uploadTypes'
import type {
  CustomerFeedbackAttachmentItem,
  CustomerFeedbackCategory,
  CustomerFeedbackItem,
  CustomerFeedbackPriority,
  CustomerFeedbackStatus,
} from '../types/feedbackTypes'

const props = defineProps<{
  panelActive: boolean
}>()

const form = reactive<{
  category: CustomerFeedbackCategory
  priority: CustomerFeedbackPriority
  title: string
  content: string
  contact: string
  relatedTaskId?: number
}>({
  category: 'TASK_EXCEPTION',
  priority: 'NORMAL',
  title: '',
  content: '',
  contact: '',
  relatedTaskId: undefined,
})

const fileInputRef = ref<HTMLInputElement | null>(null)
const attachments = ref<UploadedFileItem[]>([])
const uploading = ref(false)
const submitting = ref(false)
const historyLoading = ref(false)
const error = ref('')
const history = ref<CustomerFeedbackItem[]>([])
const imageNamePattern = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i

watch(
  () => props.panelActive,
  (active) => {
    if (active) {
      void loadHistory()
    }
  },
  { immediate: true },
)

function openFilePicker() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  await uploadSelectedFiles(files)
}

async function handlePaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith('image/'))
  if (!files.length) return
  event.preventDefault()
  await uploadSelectedFiles(files)
}

async function uploadSelectedFiles(files: File[]) {
  if (attachments.value.length + files.length > 8) {
    ElMessage.warning('最多添加 8 个附件')
    return
  }
  uploading.value = true
  error.value = ''
  try {
    for (const file of files) {
      const uploaded = await uploadFile(file)
      attachments.value.push(uploaded)
    }
    ElMessage.success('附件已添加')
  } catch (unknownError) {
    error.value = unknownError instanceof Error ? unknownError.message : '附件上传失败'
  } finally {
    uploading.value = false
  }
}

function removeAttachment(fileId: number) {
  attachments.value = attachments.value.filter((item) => item.fileId !== fileId)
}

async function submitFeedback() {
  if (submitting.value) return
  if (!form.content.trim() && attachments.value.length === 0) {
    ElMessage.warning('请填写反馈内容或添加附件')
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await createFeedback({
      category: form.category,
      priority: form.priority,
      title: form.title.trim(),
      content: form.content.trim(),
      contact: form.contact.trim(),
      relatedTaskId: form.relatedTaskId,
      pageUrl: window.location.href,
      sourcePath: `${window.location.pathname}${window.location.search}`,
      userAgent: navigator.userAgent,
      attachmentFileIds: attachments.value.map((item) => item.fileId),
    })
    ElMessage.success('反馈已提交')
    resetForm()
    await loadHistory()
  } catch (unknownError) {
    error.value = unknownError instanceof Error ? unknownError.message : '反馈提交失败'
  } finally {
    submitting.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const page = await listMyFeedback(1, 5)
    history.value = page.records
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

function resetForm() {
  form.category = 'TASK_EXCEPTION'
  form.priority = 'NORMAL'
  form.title = ''
  form.content = ''
  form.contact = ''
  form.relatedTaskId = undefined
  attachments.value = []
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

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

function formatFileSize(size?: number | null) {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function isImageAttachment(file: Pick<UploadedFileItem, 'mimeType' | 'originalFileName'> | CustomerFeedbackAttachmentItem) {
  return Boolean(file.mimeType?.toLowerCase().startsWith('image/')) || imageNamePattern.test(file.originalFileName)
}

function imageAttachments(files?: CustomerFeedbackAttachmentItem[]) {
  return (files || []).filter(isImageAttachment).slice(0, 4)
}
</script>

<style scoped>
.feedback-panel {
  display: grid;
  gap: 14px;
}

.feedback-alert {
  margin-bottom: 2px;
}

.feedback-form {
  display: grid;
  gap: 2px;
  padding: 16px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #ffffff;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.feedback-number {
  width: 100%;
}

.feedback-upload-row,
.feedback-submit-row,
.feedback-history-head,
.feedback-history-title,
.feedback-history-meta,
.feedback-attachment {
  display: flex;
  align-items: center;
}

.feedback-upload-row {
  gap: 10px;
  margin-top: 2px;
}

.feedback-file-input {
  display: none;
}

.feedback-upload-count {
  color: var(--hs-text-muted);
  font-size: 12px;
}

.feedback-attachments {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.feedback-attachment {
  min-height: 38px;
  gap: 8px;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  background: #f8fafc;
  padding: 8px 10px;
}

.feedback-attachment-thumb {
  display: block;
  flex: 0 0 auto;
  width: 54px;
  height: 54px;
  overflow: hidden;
  border-radius: 6px;
  background: #e5e7eb;
}

.feedback-attachment-thumb img,
.feedback-history-images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feedback-attachment-main {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;
}

.feedback-attachment-main a {
  min-width: 0;
  overflow: hidden;
  color: var(--hs-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-attachment-main span {
  color: var(--hs-text-muted);
  font-size: 12px;
}

.feedback-attachment-remove {
  display: inline-grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--hs-text-muted);
}

.feedback-attachment-remove:hover {
  background: #fee2e2;
  color: var(--hs-danger);
}

.feedback-submit-row {
  justify-content: flex-end;
  margin-top: 8px;
}

.feedback-history {
  display: grid;
  gap: 10px;
}

.feedback-history-head {
  justify-content: space-between;
}

.feedback-history-head h3 {
  margin: 0;
  color: var(--hs-text);
  font-size: 15px;
}

.feedback-empty,
.feedback-history-item {
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #ffffff;
}

.feedback-empty {
  padding: 18px;
  color: var(--hs-text-muted);
  text-align: center;
}

.feedback-history-item {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.feedback-history-title {
  min-width: 0;
  justify-content: space-between;
  gap: 10px;
}

.feedback-history-title strong {
  min-width: 0;
  overflow: hidden;
  color: var(--hs-text);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-history-item p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.feedback-history-images {
  display: flex;
  gap: 8px;
}

.feedback-history-images a {
  display: block;
  width: 58px;
  height: 58px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
}

.feedback-history-meta {
  flex-wrap: wrap;
  gap: 8px;
  color: var(--hs-text-soft);
  font-size: 12px;
}

@media (max-width: 640px) {
  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">任务中心</h2>
        <p class="app-muted">登录后查看与您账号相关的<strong>全部任务</strong>（含公共演示任务与本人任务）。</p>
      </div>
      <button
        class="app-secondary-button"
        type="button"
        :disabled="loading || !canQuery"
        @click="loadData(false)"
      >
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="!canQuery && !hasSessionTasks && panelActive" class="app-muted task-hint">
      请先<strong>登录</strong>以查看全部任务。
    </p>

    <p v-else-if="!canQuery && hasSessionTasks && panelActive" class="app-muted task-hint">
      当前为<strong>本机会话任务</strong>视图（未登录时）：展示你在此浏览器里触发过的任务。
    </p>

    <template v-if="canQuery || hasSessionTasks">
      <div class="app-selected-project">
        <strong>全部任务</strong>
        <span v-if="summary" class="task-count-inline">
          · 进行中 {{ summary.processingCount }} · 成功 {{ summary.successCount }} · 失败/取消等
          {{ summary.failedCount }}
        </span>
      </div>

      <div class="task-toolbar">
        <select v-model="taskTypeFilter" class="asset-type-select" :disabled="loading" @change="loadData(false)">
          <option value="">全部类型</option>
          <option value="VIDEO_PARSE">视频解析（旧接口）</option>
          <option value="DOUYIN_PARSE_TRANSCRIPT">抖音对标解析与转写</option>
          <option value="DOUYIN_REWRITE">抖音文案改写</option>
          <option value="DOUYIN_TRANSCRIPT">抖音视频转写</option>
          <option value="VIDEO_SCRIPT_ANALYZE">视频分镜解析</option>
          <option value="VIDEO_SCRIPT_URL_ANALYZE">抖音分镜解析</option>
          <option value="TTS_GENERATE">语音合成</option>
          <option value="VOICE_SAMPLE">音色试听</option>
          <option value="AVATAR_GENERATE">形象生成</option>
          <option value="SEEDANCE_TEXT_VIDEO">文生视频</option>
          <option value="SEEDANCE_FIRST_FRAME_VIDEO">首帧图生视频</option>
          <option value="SEEDANCE_FIRST_LAST_FRAME_VIDEO">首尾帧图生视频</option>
          <option value="SEEDANCE_REFERENCE_VIDEO">参照图生视频</option>
        </select>
        <select v-model="statusFilter" class="asset-type-select" :disabled="loading" @change="loadData(false)">
          <option value="">全部状态</option>
          <option value="QUEUED">排队中</option>
          <option value="RUNNING">执行中</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
          <option value="RETRYABLE">可重试</option>
          <option value="CANCELED">已取消</option>
        </select>
      </div>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="tasks.length === 0 && !loading" class="app-empty">暂无符合条件的任务。</div>
      <div v-else class="app-file-list">
        <div v-for="task in tasks" :key="task.taskId" class="app-file-item task-row">
          <div class="task-row-main">
            <strong>{{ displayTitle(task) }}</strong>
            <TaskRowSmoothProgress
              v-if="taskRowProgressEligible(task)"
              :status="task.status"
              :progress="task.progress"
            />
            <p class="task-row-meta">
              状态 {{ task.status }} · 重试 {{ task.retryCount ?? 0 }} 次
              <template v-if="task.errorCode"> · {{ task.errorCode }} </template>
              <template v-if="formatWhen(task.startedAt)">
                · 开始 {{ formatWhen(task.startedAt) }}
              </template>
              <template v-if="formatWhen(task.finishedAt)">
                · 结束 {{ formatWhen(task.finishedAt) }}
              </template>
              <template v-if="task.status === 'SUCCESS' && task.resultViewed === false && resultAssetId(task)">
                · <span class="task-unread">结果未读</span>
              </template>
            </p>
            <p v-if="task.errorMessage" class="task-row-err">{{ task.errorMessage }}</p>
          </div>
          <div class="task-row-actions">
            <span class="app-task-status" :class="statusPillClass(task.status)">{{ task.status }}</span>
            <button
              v-if="task.status === 'QUEUED' || task.status === 'RUNNING'"
              type="button"
              class="app-secondary-button task-cancel"
              :disabled="loading"
              @click="handleCancel(task.taskId)"
            >
              取消
            </button>
            <button
              v-if="
                task.status === 'RETRYABLE' ||
                task.status === 'FAILED' ||
                task.status === 'CANCELED'
              "
              type="button"
              class="app-secondary-button task-retry"
              :disabled="loading"
              @click="handleRetry(task.taskId)"
            >
              重试
            </button>
            <button
              v-if="task.status === 'SUCCESS'"
              type="button"
              class="app-secondary-button task-open-asset"
              :disabled="resultLoading"
              @click="openResult(task)"
            >
              {{ resultLoading && selectedTaskId === task.taskId ? '加载中...' : '查看结果' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="resultModalOpen" class="task-result-mask" @click.self="closeResultModal">
      <section class="task-result-modal" role="dialog" aria-modal="true" aria-label="任务结果">
        <header class="task-result-head">
          <div>
            <h3>{{ selectedResultTask ? displayTitle(selectedResultTask) : '任务结果' }}</h3>
            <p v-if="selectedResultTask" class="app-muted">
              {{ selectedResultTask.taskType }} · 任务 ID {{ selectedResultTask.taskId }}
            </p>
          </div>
          <button type="button" class="task-result-close" aria-label="关闭" @click="closeResultModal">×</button>
        </header>

        <p v-if="resultError" class="app-error">{{ resultError }}</p>

        <div v-else-if="isSeedanceVideoTask(selectedResultTask?.taskType)" class="task-result-video">
          <video v-if="seedanceVideoUrl" :src="seedanceVideoUrl" controls preload="metadata" />
          <div v-else class="task-result-empty">未找到视频地址。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'TTS_GENERATE'" class="task-result-audio">
          <audio v-if="ttsAudioUrl" :src="normalizePreviewUrl(ttsAudioUrl)" controls preload="metadata" />
          <div v-else class="task-result-empty">未找到音频地址。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'VIDEO_SCRIPT_ANALYZE'" class="task-result-storyboard">
          <div v-if="scriptShots.length" class="task-result-table-wrap">
            <table class="task-result-storyboard-table">
              <thead>
                <tr>
                  <th class="result-col-order">场景序号</th>
                  <th class="result-col-time">时间</th>
                  <th class="result-col-summary">场景概述</th>
                  <th class="result-col-dialogue">台词</th>
                  <th class="result-col-tips">拍摄技巧</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shot in scriptShots" :key="`${shot.order}-${shot.time}`">
                  <td class="result-col-order">场景{{ orderLabel(shot.order) }}</td>
                  <td class="result-col-time">{{ shot.time || '-' }}</td>
                  <td class="result-col-summary">
                    <div class="task-result-shot-text">{{ shot.page || '-' }}</div>
                    <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="task-result-bgm">
                      {{ shot.backgroundMusic }}
                    </p>
                  </td>
                  <td class="result-col-dialogue">{{ shot.content || '-' }}</td>
                  <td class="result-col-tips">{{ shot.highlight || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="task-result-empty">未找到分镜脚本数据。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'DOUYIN_REWRITE'" class="task-result-text">
          {{ douyinRewriteText || '未找到改写文案。' }}
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'AVATAR_GENERATE'" class="task-result-avatar-grid">
          <img
            v-for="url in avatarPreviewUrls"
            :key="url"
            :src="normalizePreviewUrl(url)"
            alt="生成形象"
          />
          <div v-if="!avatarPreviewUrls.length" class="task-result-empty">未找到图片预览地址。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'DOUYIN_PARSE_TRANSCRIPT'" class="task-result-text">
          {{ douyinTranscriptText || '未找到转写原文。' }}
        </div>

        <pre v-else class="task-result-json">{{ resultJsonText }}</pre>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">

import { computed, ref, watch, watchEffect } from 'vue'
import TaskRowSmoothProgress from '../../components/TaskRowSmoothProgress.vue'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import {
  cancelTask,
  getTaskDetail,
  getTaskResult,
  getTaskSummary,
  listTasks,
  markTaskViewed,
  retryTask,
} from '../../services/taskApi'
import { getSessionTaskIds } from '../../services/sessionTaskStore'
import type { TaskItem, TaskSummaryResponse } from '../../types/taskTypes'

interface ScriptShot {
  order: number
  time: string
  content: string
  backgroundMusic: string
  page: string
  highlight: string
}

const props = withDefaults(
  defineProps<{
    /** 为 false 时停止轮询（例如切换离开任务页） */
    panelActive?: boolean
  }>(),
  { panelActive: true },
)

const hasToken = ref(false)
const tasks = ref<TaskItem[]>([])
const summary = ref<TaskSummaryResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const taskTypeFilter = ref('')
const statusFilter = ref('')
const resultModalOpen = ref(false)
const resultLoading = ref(false)
const resultError = ref('')
const selectedTaskId = ref<number | null>(null)
const selectedResultTask = ref<TaskItem | null>(null)
const selectedTaskResult = ref<unknown>(null)
const selectedOutputJson = ref<unknown>(null)

const canQuery = computed(() => hasToken.value)
const hasSessionTasks = computed(() => getSessionTaskIds().length > 0)
const resultObject = computed(() => (isRecord(selectedTaskResult.value) ? selectedTaskResult.value : null))
const outputObject = computed(() => (isRecord(selectedOutputJson.value) ? selectedOutputJson.value : null))
const seedanceVideoUrl = computed(() => stringField(resultObject.value, 'videoUrl'))
const ttsAudioUrl = computed(() => stringField(resultObject.value, 'previewUrl'))
const scriptShots = computed<ScriptShot[]>(() => {
  const scripts = resultObject.value?.scripts
  return Array.isArray(scripts) ? scripts.filter(isScriptShot) : []
})
const douyinRewriteText = computed(() => stringField(resultObject.value, 'translatedText'))
const avatarPreviewUrls = computed(() => {
  const fromOutput = arrayStringField(outputObject.value, 'previewUrls')
  if (fromOutput.length) {
    return fromOutput
  }
  return arrayStringField(resultObject.value, 'previewUrls')
})
const douyinTranscriptText = computed(() => {
  const transcriptResult = isRecord(resultObject.value?.transcriptResult)
    ? resultObject.value.transcriptResult
    : isRecord(outputObject.value?.transcriptResult)
      ? outputObject.value.transcriptResult
      : null
  return stringField(transcriptResult, 'originalText')
})
const resultJsonText = computed(() => JSON.stringify(selectedTaskResult.value ?? selectedOutputJson.value ?? {}, null, 2))

function refreshAuthState() {
  hasToken.value = !!getAuthToken()
}

watch(
  () =>
    [
      props.panelActive,
      taskTypeFilter.value,
      statusFilter.value,
    ] as const,
  () => {
    if (!props.panelActive) {
      return
    }
    refreshAuthState()
    void loadData(false)
  },
  { immediate: true },
)

watchEffect((onCleanup) => {
  if (!props.panelActive) {
    return
  }
  refreshAuthState()
  if (!canQuery.value && !hasSessionTasks.value) {
    return
  }
  const hasActive = tasks.value.some((t) => t.status === 'QUEUED' || t.status === 'RUNNING')
  if (!hasActive) {
    return
  }
  const timer = window.setInterval(() => {
    void loadData(true)
  }, 3000)
  onCleanup(() => window.clearInterval(timer))
})

async function loadData(silent: boolean) {
  refreshAuthState()
  const useSessionFallback = !hasToken.value
  if (useSessionFallback && !hasSessionTasks.value) {
    tasks.value = []
    summary.value = null
    if (!silent) {
      loading.value = false
    }
    return
  }
  if (!silent) {
    loading.value = true
    errorMessage.value = ''
  }
  try {
    const typeArg = taskTypeFilter.value.trim()
    const statusArg = statusFilter.value.trim()
    if (useSessionFallback) {
      const ids = getSessionTaskIds()
      const details = await Promise.all(ids.map((id) => getTaskDetail(id).catch(() => null)))
      let list = details.filter((x): x is TaskItem => !!x)
      if (typeArg) {
        list = list.filter((t) => t.taskType === typeArg)
      }
      if (statusArg) {
        list = list.filter((t) => String(t.status) === statusArg)
      }
      tasks.value = list
      summary.value = {
        processingCount: list.filter((t) => t.status === 'QUEUED' || t.status === 'RUNNING').length,
        successCount: list.filter((t) => t.status === 'SUCCESS').length,
        failedCount: list.filter((t) => ['FAILED', 'RETRYABLE', 'CANCELED'].includes(String(t.status))).length,
        records: list,
      }
    } else {
      const [list, sum] = await Promise.all([
        listTasks({
          ...(typeArg ? { taskType: typeArg } : {}),
          ...(statusArg ? { status: statusArg } : {}),
          pageNo: 1,
          pageSize: 50,
        }),
        getTaskSummary(),
      ])
      tasks.value = list
      summary.value = sum
    }
  } catch (error) {
    if (!silent) {
      errorMessage.value = error instanceof Error ? error.message : '加载任务失败'
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

async function handleRetry(taskId: number) {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await retryTask(taskId)
    await loadData(false)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '重试失败'
  } finally {
    loading.value = false
  }
}

async function handleCancel(taskId: number) {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await cancelTask(taskId)
    await loadData(false)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '取消失败'
  } finally {
    loading.value = false
  }
}

function displayTitle(task: TaskItem) {
  if (task.taskTitle && task.taskTitle.trim()) {
    return task.taskTitle
  }
  return taskLabel(task.taskType)
}

function taskLabel(taskType: string) {
  if (taskType === 'TTS_GENERATE') {
    return '语音合成'
  }
  if (taskType === 'AVATAR_GENERATE') {
    return '形象生成'
  }
  if (taskType === 'DOUYIN_PARSE_TRANSCRIPT') {
    return '抖音对标解析与转写'
  }
  if (taskType === 'DOUYIN_REWRITE') {
    return '抖音文案改写'
  }
  if (taskType === 'DOUYIN_TRANSCRIPT') {
    return '抖音视频转写'
  }
  if (taskType === 'VIDEO_SCRIPT_ANALYZE') {
    return '视频分镜解析'
  }
  if (taskType === 'VIDEO_SCRIPT_URL_ANALYZE') {
    return '抖音分镜解析'
  }
  if (taskType === 'SEEDANCE_TEXT_VIDEO') {
    return '文生视频'
  }
  if (taskType === 'SEEDANCE_FIRST_FRAME_VIDEO') {
    return '首帧图生视频'
  }
  if (taskType === 'SEEDANCE_FIRST_LAST_FRAME_VIDEO') {
    return '首尾帧图生视频'
  }
  if (taskType === 'SEEDANCE_REFERENCE_VIDEO') {
    return '参照图生视频'
  }
  return taskType
}

function isSeedanceVideoTask(taskType: string | undefined) {
  return (
    taskType === 'SEEDANCE_TEXT_VIDEO' ||
    taskType === 'SEEDANCE_FIRST_FRAME_VIDEO' ||
    taskType === 'SEEDANCE_FIRST_LAST_FRAME_VIDEO' ||
    taskType === 'SEEDANCE_REFERENCE_VIDEO'
  )
}

function taskRowProgressEligible(task: TaskItem) {
  return task.status === 'QUEUED' || task.status === 'RUNNING' || task.status === 'SUCCESS'
}

function resultAssetId(task: TaskItem): number | null {
  const rid = task.resultAssetId
  if (typeof rid === 'number' && rid > 0) {
    return rid
  }
  return null
}

function formatWhen(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return null
  }
  return d.toLocaleString()
}

function statusPillClass(status: string) {
  const raw = String(status || '').toUpperCase()
  const key = ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(raw)
    ? raw
    : 'OTHER'
  return `task-status-pill--${key}`
}

async function openResult(task: TaskItem) {
  resultLoading.value = true
  selectedTaskId.value = task.taskId
  resultError.value = ''
  selectedTaskResult.value = null
  selectedOutputJson.value = parseJsonObject(task.outputJson)
  selectedResultTask.value = task
  resultModalOpen.value = true

  try {
    const [detail, taskResult] = await Promise.all([
      getTaskDetail(task.taskId).catch(() => task),
      getTaskResult<unknown>(task.taskId),
    ])
    selectedResultTask.value = detail
    selectedTaskResult.value = taskResult.result
    selectedOutputJson.value = parseJsonObject(detail.outputJson) ?? selectedOutputJson.value
    await markTaskViewed(task.taskId)
    void loadData(true)
  } catch (error) {
    resultError.value = error instanceof Error ? error.message : '查询任务结果失败'
  } finally {
    resultLoading.value = false
    selectedTaskId.value = null
  }
}

function closeResultModal() {
  resultModalOpen.value = false
  resultError.value = ''
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'string' ? raw : ''
}

function arrayStringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function isScriptShot(value: unknown): value is ScriptShot {
  return isRecord(value) && typeof value.order === 'number'
}

function orderLabel(order: number) {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (order >= 1 && order <= labels.length) {
    return labels[order - 1]
  }
  return String(order)
}

function normalizePreviewUrl(url: string) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}
</script>

<style scoped>
/* —— 任务中心：现代 SaaS 视觉（仅本页覆盖全局 app-card / app-file-item） —— */

section.app-card.app-page-stack {
  /* 与全局 .app-page-stack / .app-hero 同宽且水平居中，禁止 margin 简写顶掉 margin: auto */
  box-sizing: border-box;
  width: min(var(--app-content-width), calc(100% - 76px));
  max-width: 100%;
  margin-top: 0;
  margin-bottom: 24px;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid #f0f1f3;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.app-card-header {
  align-items: flex-start;
  margin-bottom: 24px;
}

.app-card-header .app-card-title {
  margin: 0 0 12px;
  color: #111827;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.app-card-header .app-muted {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.app-card-header .app-secondary-button {
  flex-shrink: 0;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  transform: none;
  box-shadow: none;
}

.app-card-header .app-secondary-button:hover:not(:disabled) {
  background: #eef0f3;
  border-color: #e5e7eb;
  color: #111827;
  transform: none;
}

.task-hint {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

/* 当前范围：轻量信息卡 */
.app-selected-project {
  box-sizing: border-box;
  width: 100%;
  margin-top: 0;
  margin-bottom: 24px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: #f8f9fc;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: none;
}

.app-selected-project strong {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.task-count-inline {
  font-size: 12px;
  color: #6b7280;
}

/* 筛选：轻工具栏 */
.task-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 240px));
  align-items: center;
  gap: 12px;
  margin-top: 0;
  margin-bottom: 16px;
}

.task-toolbar .asset-type-select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.task-toolbar .asset-type-select:hover:not(:disabled) {
  border-color: #7c6cff;
}

.task-toolbar .asset-type-select:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.15);
}

.task-toolbar .asset-type-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-error {
  margin: 0 0 16px;
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.app-empty {
  margin-top: 8px;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  background: #fafbfc;
  color: #6b7280;
  font-size: 13px;
  padding: 32px 24px;
}

.app-file-list {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 12px;
  margin-top: 8px;
}

/* 任务卡片 */
.app-file-item.task-row {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 0;
  padding: 16px;
  border: 1px solid #f0f1f3;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: none;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;
}

.app-file-item.task-row:hover {
  border-color: #e5e7eb;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.task-row-main {
  flex: 1;
  min-width: 0;
}

.app-file-item.task-row .task-row-main > strong {
  display: block;
  margin: 0 0 8px;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-row-meta {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.55;
}

.task-row-err {
  margin: 12px 0 0;
  color: #ef4444;
  font-size: 12px;
  line-height: 1.5;
}

.task-unread {
  color: #6c5ce7;
  font-weight: 500;
}

/* 状态标签 */
.app-file-item .app-task-status {
  min-height: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.task-status-pill--RUNNING {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.task-status-pill--SUCCESS {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.task-status-pill--FAILED {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.task-status-pill--QUEUED {
  background: rgba(124, 108, 255, 0.12);
  color: #6c5ce7;
}

.task-status-pill--RETRYABLE {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.task-status-pill--CANCELED {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.task-status-pill--OTHER {
  background: rgba(107, 114, 128, 0.08);
  color: #6b7280;
}

.task-row-actions {
  display: grid;
  min-width: 112px;
  flex-shrink: 0;
  align-items: flex-end;
  justify-items: end;
  gap: 10px;
}

.task-row-actions .app-secondary-button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  transform: none;
  box-shadow: none;
}

.task-row-actions .app-secondary-button:hover:not(:disabled) {
  background: #eef0f3;
  border-color: #e5e7eb;
  color: #111827;
  transform: none;
}

.task-row-actions .task-cancel:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: #fecaca;
  color: #b91c1c;
}

.task-open-asset,
.task-retry,
.task-cancel {
  white-space: nowrap;
}

@media (max-width: 760px) {
  section.app-card.app-page-stack {
    width: calc(100% - 24px);
    padding: 18px;
  }

  .task-toolbar {
    grid-template-columns: 1fr;
  }

  .app-file-item.task-row {
    grid-template-columns: 1fr;
  }

  .task-row-actions {
    width: 100%;
    min-width: 0;
    grid-template-columns: auto auto;
    align-items: center;
    justify-items: start;
  }

  .task-row-actions .app-task-status {
    justify-self: start;
  }

  .task-row-actions .app-secondary-button {
    justify-self: end;
  }
}

.task-result-mask {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(15, 23, 42, 0.42);
}

.task-result-modal {
  display: grid;
  width: min(1100px, 100%);
  max-height: min(760px, calc(100vh - 64px));
  gap: 16px;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.22);
  padding: 20px;
}

.task-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #edf0f6;
  padding-bottom: 14px;
}

.task-result-head h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 18px;
  font-weight: 650;
}

.task-result-head p {
  margin: 0;
  font-size: 12px;
}

.task-result-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8f9fc;
  color: #374151;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.task-result-close:hover {
  background: #eef0f3;
}

.task-result-video,
.task-result-audio,
.task-result-storyboard,
.task-result-avatar-grid,
.task-result-text,
.task-result-json {
  min-height: 0;
  overflow: auto;
}

.task-result-video video {
  display: block;
  width: 100%;
  max-height: 600px;
  border-radius: 10px;
  background: #111827;
}

.task-result-audio {
  display: grid;
  min-height: 180px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  padding: 24px;
}

.task-result-audio audio {
  width: 100%;
}

.task-result-table-wrap {
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fff;
}

.task-result-storyboard-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  table-layout: fixed;
  color: #2d3446;
  font-size: 13px;
}

.task-result-storyboard-table th {
  padding: 12px 14px;
  border-bottom: 1px solid #edf0f6;
  background: #f5f6fa;
  color: #5c6477;
  font-weight: 750;
  text-align: left;
}

.task-result-storyboard-table td {
  padding: 14px;
  border-bottom: 1px solid #edf0f6;
  line-height: 1.7;
  vertical-align: top;
}

.task-result-storyboard-table tbody tr:last-child td {
  border-bottom: 0;
}

.result-col-order {
  width: 96px;
  font-weight: 700;
}

.result-col-time {
  width: 138px;
  color: #6b7280;
}

.result-col-summary {
  width: 320px;
}

.result-col-dialogue {
  width: 240px;
}

.result-col-tips {
  width: auto;
}

.task-result-shot-text {
  white-space: pre-wrap;
}

.task-result-bgm {
  display: inline-flex;
  margin: 10px 0 0;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

.task-result-text {
  min-height: 220px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  color: #2d3446;
  padding: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.task-result-avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.task-result-avatar-grid img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #f8f9fc;
  object-fit: contain;
}

.task-result-json {
  margin: 0;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #111827;
  color: #f9fafb;
  padding: 16px;
  font-size: 12px;
  line-height: 1.6;
}

.task-result-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 1px dashed #d8dce8;
  border-radius: 10px;
  background: #fbfcff;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 720px) {
  .task-result-mask {
    padding: 14px;
  }

  .task-result-modal {
    max-height: calc(100vh - 28px);
    padding: 16px;
  }
}
</style>

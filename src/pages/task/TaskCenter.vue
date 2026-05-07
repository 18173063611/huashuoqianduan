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
      请在「用户与资产」中<strong>登录</strong>以查看全部任务。
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
          <option value="SCRIPT_REWRITE">文案改写</option>
          <option value="STORYBOARD_GENERATE">分镜生成</option>
          <option value="TTS_GENERATE">语音合成</option>
          <option value="AVATAR_GENERATE">形象生成</option>
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
              v-if="task.status === 'SUCCESS' && resultAssetId(task)"
              type="button"
              class="app-secondary-button task-open-asset"
              @click="openResult(task)"
            >
              查看资产
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import TaskRowSmoothProgress from '../../components/TaskRowSmoothProgress.vue'
import { getAuthToken } from '../../services/request'
import {
  cancelTask,
  getTaskDetail,
  getTaskSummary,
  listTasks,
  markTaskViewed,
  retryTask,
} from '../../services/taskApi'
import { getSessionTaskIds } from '../../services/sessionTaskStore'
import type { TaskItem, TaskSummaryResponse } from '../../types/taskTypes'

const props = withDefaults(
  defineProps<{
    /** 为 false 时停止轮询（例如切换离开任务页） */
    panelActive?: boolean
  }>(),
  { panelActive: true },
)

const emit = defineEmits<{
  openAsset: [assetId: number]
}>()

const hasToken = ref(false)
const tasks = ref<TaskItem[]>([])
const summary = ref<TaskSummaryResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const taskTypeFilter = ref('')
const statusFilter = ref('')

const canQuery = computed(() => hasToken.value)
const hasSessionTasks = computed(() => getSessionTaskIds().length > 0)

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
  if (taskType === 'VIDEO_PARSE') {
    return '视频解析'
  }
  if (taskType === 'SCRIPT_REWRITE') {
    return '文案改写'
  }
  if (taskType === 'STORYBOARD_GENERATE') {
    return '分镜生成'
  }
  return taskType
}

function taskRowProgressEligible(task: TaskItem) {
  return task.status === 'QUEUED' || task.status === 'RUNNING' || task.status === 'SUCCESS'
}

function resultAssetId(task: TaskItem): number | null {
  const rid = task.resultAssetId
  if (typeof rid === 'number' && rid > 0) {
    return rid
  }
  if (!task.outputJson) {
    return null
  }
  try {
    const o = JSON.parse(task.outputJson) as { resultAssetId?: number; assetIds?: number[] }
    if (typeof o.resultAssetId === 'number' && o.resultAssetId > 0) {
      return o.resultAssetId
    }
    const first = o.assetIds?.[0]
    if (typeof first === 'number' && first > 0) {
      return first
    }
  } catch {
    /* ignore */
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
  const id = resultAssetId(task)
  if (id == null) {
    return
  }
  try {
    await markTaskViewed(task.taskId)
    void loadData(true)
  } catch {
    /* 标记已读失败不阻断跳转 */
  }
  emit('openAsset', id)
}
</script>

<style scoped>
/* —— 任务中心：现代 SaaS 视觉（仅本页覆盖全局 app-card / app-file-item） —— */

section.app-card.app-page-stack {
  /* 与全局 .app-page-stack / .app-hero 同宽且水平居中，禁止 margin 简写顶掉 margin: auto */
  box-sizing: border-box;
  width: min(var(--app-content-width), calc(100% - 76px));
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 0;
  margin-bottom: 16px;
}

.task-toolbar .asset-type-select {
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
  gap: 12px;
  margin-top: 8px;
}

/* 任务卡片 */
.app-file-item.task-row {
  align-items: flex-start;
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
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
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
</style>

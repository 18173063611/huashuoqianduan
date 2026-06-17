<template>
  <main class="system-page app-page-stack">
    <section class="system-head">
      <div>
        <span class="system-eyebrow">系统管理</span>
        <h1>最近使用</h1>
        <p>汇总最近生成任务、最近资产和常用工具访问记录，方便继续未完成的创作链路。</p>
      </div>
      <div class="system-head-actions">
        <button class="app-secondary-button" type="button" :disabled="loading" @click="loadData">
          {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </section>

    <div class="system-stat-grid">
      <article>
        <strong>{{ recentTasks.length }}</strong>
        <span>最近任务</span>
      </article>
      <article>
        <strong>{{ recentAssets.length }}</strong>
        <span>最近资产</span>
      </article>
      <article>
        <strong>{{ recentTools.length }}</strong>
        <span>最近工具</span>
      </article>
    </div>

    <p v-if="errorMessage" class="system-error">{{ errorMessage }}</p>

    <section class="system-panel">
      <header class="system-panel-head">
        <div>
          <h2>最近生成任务</h2>
          <p>优先展示刚提交、运行中和已完成的生成任务。</p>
        </div>
        <RouterLink class="app-secondary-button" to="/my-videos">进入我的视频</RouterLink>
      </header>
      <div v-if="loading" class="system-empty">正在加载最近任务...</div>
      <div v-else-if="!recentTasks.length" class="system-empty">暂无最近生成任务。</div>
      <div v-else class="system-list">
        <article v-for="task in recentTasks" :key="task.taskId" class="system-row-card">
          <div class="system-row-main">
            <span class="system-row-type">{{ taskTypeLabel(task.taskType) }}</span>
            <h3>{{ taskTitle(task) }}</h3>
            <p>{{ formatDate(task.createdAt) }} · {{ task.modelCode || task.provider || '默认模型' }}</p>
          </div>
          <div class="system-row-side">
            <span class="system-status" :class="taskStatusClass(task.status)">
              {{ taskStatusLabel(task.status) }}
            </span>
            <div class="system-progress" aria-hidden="true">
              <i :style="{ width: `${taskProgress(task)}%` }"></i>
            </div>
            <RouterLink class="system-text-link" :to="`/my-videos?taskId=${task.taskId}`">
              查看任务
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <section class="system-panel">
      <header class="system-panel-head">
        <div>
          <h2>最近资产</h2>
          <p>展示最近上传、生成或保存的图片、视频、音频、文案和分镜素材。</p>
        </div>
        <RouterLink class="app-secondary-button" to="/assets?tab=materials">进入资产中心</RouterLink>
      </header>
      <div v-if="loading" class="system-empty">正在加载最近资产...</div>
      <div v-else-if="!recentAssets.length" class="system-empty">暂无最近资产。</div>
      <div v-else class="system-asset-grid">
        <article v-for="asset in recentAssets" :key="asset.assetId" class="system-asset-card">
          <div class="system-asset-preview">
            <img
              v-if="assetPreviewUrl(asset)"
              :src="assetPreviewUrl(asset)"
              :alt="asset.fileName"
              loading="lazy"
            />
            <span v-else>{{ assetTypeLabel(asset.assetType) }}</span>
          </div>
          <div class="system-asset-body">
            <span>{{ assetTypeLabel(asset.assetType) }} · {{ formatSize(asset.fileSize) }}</span>
            <h3>{{ asset.fileName }}</h3>
            <p>{{ formatDate(asset.createdAt) }}</p>
            <RouterLink class="system-text-link" :to="`/assets?tab=materials&assetId=${asset.assetId}`">
              查看资产
            </RouterLink>
          </div>
        </article>
      </div>
    </section>

    <section class="system-panel">
      <header class="system-panel-head">
        <div>
          <h2>最近工具</h2>
          <p>自动记录工作台里最近打开过的创作入口。</p>
        </div>
        <button class="app-secondary-button" type="button" :disabled="!recentTools.length" @click="clearTools">
          清空记录
        </button>
      </header>
      <div v-if="!recentTools.length" class="system-empty">暂无工具访问记录。</div>
      <div v-else class="system-list">
        <article v-for="tool in recentTools" :key="`${tool.routeName}-${tool.visitedAt}`" class="system-row-card">
          <div class="system-row-main">
            <span class="system-row-type">{{ tool.subtitle || '工作台入口' }}</span>
            <h3>{{ tool.title }}</h3>
            <p>{{ formatDate(tool.visitedAt) }}</p>
          </div>
          <RouterLink class="app-secondary-button" :to="tool.path">继续使用</RouterLink>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getAssets } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import { listTasks } from '../../services/taskApi'
import {
  clearRecentTools,
  loadRecentTools,
  type SystemRecentToolItem,
} from '../../services/systemWorkspaceStore'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { TaskItem } from '../../types/taskTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'

defineOptions({ inheritAttrs: false })

const loading = ref(false)
const errorMessage = ref('')
const recentTasks = ref<TaskItem[]>([])
const recentAssets = ref<AssetItem[]>([])
const recentTools = ref<SystemRecentToolItem[]>(loadRecentTools())

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  recentTools.value = loadRecentTools()
  const [taskResult, assetResult] = await Promise.allSettled([
    listTasks({ pageNo: 1, pageSize: 8 }),
    getAssets({ scope: 'all', sort: 'createdAtDesc', pageNo: 1, pageSize: 8 }),
  ])

  if (taskResult.status === 'fulfilled') {
    recentTasks.value = taskResult.value
  } else {
    errorMessage.value = '最近任务加载失败，请稍后重试。'
  }

  if (assetResult.status === 'fulfilled') {
    recentAssets.value = assetResult.value
  } else {
    errorMessage.value = errorMessage.value || '最近资产加载失败，请稍后重试。'
  }

  loading.value = false
}

function clearTools() {
  clearRecentTools()
  recentTools.value = []
}

function taskTitle(task: TaskItem) {
  return task.taskTitle || `${taskTypeLabel(task.taskType)} #${task.taskId}`
}

function taskProgress(task: TaskItem) {
  if (task.status === 'SUCCESS') return 100
  if (task.status === 'FAILED' || task.status === 'CANCELED') return 100
  const progress = Number(task.progress ?? 0)
  return Math.max(6, Math.min(100, Number.isFinite(progress) ? progress : 0))
}

function taskStatusLabel(status: string) {
  const map: Record<string, string> = {
    QUEUED: '排队中',
    RUNNING: '生成中',
    SUCCESS: '已完成',
    FAILED: '失败',
    RETRYABLE: '可重试',
    CANCELED: '已取消',
  }
  return map[status] || status
}

function taskStatusClass(status: string) {
  if (status === 'SUCCESS') return 'is-success'
  if (status === 'FAILED' || status === 'RETRYABLE' || status === 'CANCELED') return 'is-danger'
  return 'is-running'
}

function assetTypeLabel(type: AssetType) {
  const map: Record<AssetType, string> = {
    TEXT: '文案',
    IMAGE: '图片',
    AUDIO: '音频',
    VIDEO: '视频',
    COVER: '封面',
    JSON: '分镜',
  }
  return map[type] || type
}

function assetPreviewUrl(asset: AssetItem) {
  const url = asset.thumbnailUrl || (asset.assetType === 'IMAGE' ? asset.fileUrl : '')
  return normalizeUrl(url)
}

function normalizeUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function formatSize(size?: number | null) {
  const bytes = Number(size || 0)
  if (!bytes) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.system-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.system-head,
.system-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.system-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}

.system-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #2563eb;
  font-weight: 700;
}

.system-head h1,
.system-panel h2,
.system-row-main h3,
.system-asset-body h3 {
  margin: 0;
  color: #0f172a;
}

.system-head p,
.system-panel p,
.system-row-main p,
.system-asset-body p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.system-head-actions {
  flex: 0 0 auto;
}

.system-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.system-stat-grid article {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 18px 20px;
}

.system-stat-grid strong {
  display: block;
  color: #0f172a;
  font-size: 28px;
}

.system-stat-grid span {
  color: #64748b;
}

.system-panel {
  padding: 20px;
}

.system-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.system-list {
  display: grid;
  gap: 12px;
}

.system-row-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.system-row-type,
.system-asset-body span {
  display: inline-flex;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.system-row-side {
  display: grid;
  justify-items: end;
  gap: 8px;
  min-width: 150px;
}

.system-status {
  border-radius: 999px;
  padding: 4px 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.system-status.is-success {
  background: #ecfdf5;
  color: #047857;
}

.system-status.is-danger {
  background: #fef2f2;
  color: #dc2626;
}

.system-progress {
  width: 120px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e7eb;
}

.system-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.system-asset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.system-asset-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.system-asset-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 10;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 700;
}

.system-asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.system-asset-body {
  padding: 14px;
}

.system-asset-body h3 {
  overflow: hidden;
  margin-top: 6px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
}

.system-text-link {
  color: #2563eb;
  font-weight: 700;
  text-decoration: none;
}

.system-empty,
.system-error {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 22px;
  background: #f8fafc;
  color: #64748b;
}

.system-error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

@media (max-width: 900px) {
  .system-page {
    padding: 16px;
  }

  .system-head,
  .system-panel-head,
  .system-row-card {
    display: grid;
    grid-template-columns: 1fr;
  }

  .system-row-side {
    justify-items: stretch;
  }

  .system-progress {
    width: 100%;
  }

  .system-stat-grid,
  .system-asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>

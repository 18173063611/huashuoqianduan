<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">资产中心</h2>
        <p class="app-muted">
          使用下方切换在「全局资产」与「私有资产」之间查看；全局为公共内容，私有为当前登录账号下上传/生成的条目。
        </p>
        <div class="asset-scope-segment" role="tablist" aria-label="资产范围">
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'global' }"
            role="tab"
            :aria-selected="listScope === 'global'"
            :disabled="loading"
            @click="listScope = 'global'"
          >
            全局资产
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'private' }"
            role="tab"
            :aria-selected="listScope === 'private'"
            :disabled="loading"
            @click="listScope = 'private'"
          >
            私有资产
          </button>
        </div>
      </div>
      <div class="asset-header-actions">
        <select v-model="selectedType" class="asset-type-select" :disabled="loading" @change="loadAssets">
          <option value="">全部类型</option>
          <option value="TEXT">TEXT 文本</option>
          <option value="IMAGE">IMAGE 图片</option>
          <option value="AUDIO">AUDIO 音频</option>
          <option value="VIDEO">VIDEO 视频</option>
          <option value="COVER">COVER 封面</option>
          <option value="JSON">JSON 数据</option>
        </select>
        <select v-model="selectedSourceType" class="asset-type-select" :disabled="loading">
          <option value="">全部来源</option>
          <option v-for="item in sourceTypeOptions" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-model="sortKey" class="asset-type-select" :disabled="loading">
          <option value="createdAtDesc">按时间（新→旧）</option>
          <option value="createdAtAsc">按时间（旧→新）</option>
          <option value="fileNameAsc">按文件名（A→Z）</option>
          <option value="fileSizeDesc">按大小（大→小）</option>
        </select>
        <input
          v-model="keyword"
          class="asset-search"
          type="search"
          :disabled="loading"
          placeholder="搜索文件名..."
        />
        <button class="app-secondary-button" type="button" :disabled="loading" @click="loadAssets">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="app-selected-project">
      <template v-if="listScope === 'global'">
        全局资产 · <strong>公共演示与全员可见内容</strong>
      </template>
      <template v-else>
        私有资产 · <strong>当前账号下上传/生成</strong>
      </template>
      <span class="asset-count">共 {{ assets.length }} 条</span>
    </div>
    <p v-if="jumpHint" class="asset-jump-hint app-muted">{{ jumpHint }}</p>
    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

    <div v-if="assets.length === 0" class="app-empty asset-empty">
        <div class="asset-empty-title">📂 暂无资产</div>
        <div class="asset-empty-subtitle">{{ emptySubtitle }}</div>
        <button
          v-if="listScope === 'private' && !hasToken"
          class="app-primary-button asset-empty-action"
          type="button"
          @click="jumpHint = '请从左侧进入「用户中心」登录后再查看私有资产。'"
        >
          去登录
        </button>
        <button
          v-else
          class="app-primary-button asset-empty-action"
          type="button"
          @click="jumpHint = '从左侧进入任意模块开始生成。'"
        >
          去生成
        </button>
      </div>
      <div v-else class="app-file-list">
        <div
          v-for="asset in assets"
          :id="assetRowDomId(asset.assetId)"
          :key="asset.assetId"
          class="app-file-item"
          :class="{ 'asset-row-highlight': highlightedId === asset.assetId }"
        >
          <div class="asset-row-main">
            <strong class="asset-row-title">{{ asset.fileName }}</strong>
            <p class="asset-row-meta">
              {{ asset.assetType }} · {{ formatFileSize(asset.fileSize) }} · {{ asset.sourceType }}
              <template v-if="asset.createdAt">· {{ formatTime(asset.createdAt) }}</template>
            </p>
            <div class="asset-row-preview">
              <template v-if="isImage(asset)">
                <img :src="resolveFileUrl(asset.thumbnailUrl || asset.fileUrl)" alt="asset preview" />
              </template>
              <template v-else-if="isAudio(asset)">
                <audio :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
              </template>
              <template v-else-if="isVideo(asset)">
                <video :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
              </template>
              <template v-else>
                <span class="app-muted">此类型建议点击“预览”查看。</span>
              </template>
            </div>
          </div>
          <div class="asset-row-actions">
            <a class="app-secondary-button asset-open" :href="resolveFileUrl(asset.fileUrl)" target="_blank" rel="noreferrer">预览</a>
            <button class="app-secondary-button" type="button" @click="copyLink(asset)">复制链接</button>
            <button
              v-if="asset.metadataJson"
              class="app-secondary-button"
              type="button"
              @click="openMetadata(asset)"
            >
              metadata
            </button>
            <button
              v-if="asset.ownerUserId != null"
              class="app-secondary-button asset-danger"
              type="button"
              :disabled="loading"
              @click="handleDelete(asset)"
            >
              删除
            </button>
          </div>
        </div>
      </div>

    <div v-if="metadataModalOpen" class="asset-modal-backdrop" @click.self="closeMetadata">
      <div class="asset-modal">
        <div class="asset-modal-header">
          <strong>metadataJson</strong>
          <button class="app-secondary-button" type="button" @click="closeMetadata">关闭</button>
        </div>
        <p class="app-muted asset-modal-subtitle">{{ metadataTitle }}</p>
        <pre class="asset-modal-code">{{ metadataPretty }}</pre>
        <div class="asset-modal-actions">
          <button class="app-secondary-button" type="button" @click="copyMetadata">复制</button>
          <a class="app-secondary-button asset-open" :href="metadataLink" target="_blank" rel="noreferrer">打开预览</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { deleteAsset, getAssets } from '../../services/assetApi'
import type { AssetListSort, AssetListScope } from '../../services/assetApi'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'

const props = defineProps<{
  /** 从任务中心等入口跳转时高亮并滚动到该资产 */
  highlightAssetId?: number | null
}>()

const emit = defineEmits<{
  highlightConsumed: []
}>()

const KNOWN_SOURCE_TYPES = ['AI_GENERATED', 'DEMO', 'MANUAL_CREATED', 'SYSTEM_MOCK', 'USER_UPLOAD'] as const

const assets = ref<AssetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const highlightedId = ref<number | null>(null)
const jumpHint = ref('')
const selectedType = ref<'' | AssetType>('')
const selectedSourceType = ref<string>('')
const sortKey = ref<AssetListSort>('createdAtDesc')
const keyword = ref('')
const listScope = ref<AssetListScope>('global')
/** 每次 loadAssets 时从 localStorage 刷新，避免登录后仍显示未登录提示 */
const hasToken = ref(false)
let keywordReloadTimer: number | null = null
let highlightClearTimer: number | null = null

const metadataModalOpen = ref(false)
const metadataPretty = ref('')
const metadataTitle = ref('')
const metadataLink = ref('#')

const emptySubtitle = computed(() => {
  if (listScope.value === 'private' && !hasToken.value) {
    return '请先登录用户中心，再查看与当前账号绑定的私有资产。'
  }
  if (listScope.value === 'private') {
    return '当前账号下尚无私有资产，可在各模块上传或生成后在此查看。'
  }
  return '当前没有符合条件的公共资产，或可先在其他模块生成演示内容。'
})

const sourceTypeOptions = computed(() => {
  const set = new Set<string>(KNOWN_SOURCE_TYPES)
  for (const a of assets.value) {
    if (a.sourceType) {
      set.add(a.sourceType)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

onMounted(() => {
  void loadAssets()
})

watch(listScope, () => {
  scheduleReload()
})

watch([selectedSourceType, sortKey], () => {
  scheduleReload()
})

watch(keyword, () => {
  scheduleKeywordReload()
})

watch(
  () => props.highlightAssetId,
  async (id) => {
    if (id == null || id <= 0) {
      return
    }
    await nextTick()
    applyHighlightWhenReady(id)
  },
)

onBeforeUnmount(() => {
  clearHighlightTimer()
  clearKeywordReloadTimer()
})

function scheduleReload() {
  if (loading.value) {
    return
  }
  void loadAssets()
}

function scheduleKeywordReload() {
  clearKeywordReloadTimer()
  keywordReloadTimer = window.setTimeout(() => {
    keywordReloadTimer = null
    void loadAssets()
  }, 320)
}

async function loadAssets() {
  loading.value = true
  errorMessage.value = ''
  hasToken.value = !!getAuthToken()
  try {
    assets.value = await getAssets({
      scope: listScope.value,
      assetType: selectedType.value || undefined,
      sourceType: selectedSourceType.value || undefined,
      keyword: keyword.value || undefined,
      sort: sortKey.value,
    })
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    loading.value = false
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  }
}

function clearKeywordReloadTimer() {
  if (keywordReloadTimer != null) {
    window.clearTimeout(keywordReloadTimer)
    keywordReloadTimer = null
  }
}

function clearHighlightTimer() {
  if (highlightClearTimer != null) {
    window.clearTimeout(highlightClearTimer)
    highlightClearTimer = null
  }
}

function applyHighlightWhenReady(assetId: number) {
  if (loading.value) {
    return
  }
  const found = assets.value.some((a) => a.assetId === assetId)
  if (!found) {
    jumpHint.value = '该资产不在当前列表中，可点击刷新后再试。'
    emit('highlightConsumed')
    return
  }
  jumpHint.value = '已从任务跳转至对应资产。'
  highlightedId.value = assetId
  clearHighlightTimer()
  void nextTick().then(() => {
    document.getElementById(assetRowDomId(assetId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  highlightClearTimer = window.setTimeout(() => {
    highlightedId.value = null
    jumpHint.value = ''
    highlightClearTimer = null
    emit('highlightConsumed')
  }, 6000)
}

function assetRowDomId(assetId: number) {
  return `asset-row-${assetId}`
}

function resolveFileUrl(url: string) {
  if (!url) {
    return '#'
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function isImage(asset: AssetItem) {
  return asset.assetType === 'IMAGE' || asset.assetType === 'COVER' || (asset.mimeType || '').startsWith('image/')
}

function isAudio(asset: AssetItem) {
  return asset.assetType === 'AUDIO' || (asset.mimeType || '').startsWith('audio/')
}

function isVideo(asset: AssetItem) {
  return asset.assetType === 'VIDEO' || (asset.mimeType || '').startsWith('video/')
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(value: string) {
  // 后端是 ISO 或 LocalDateTime 默认序列化字符串，这里做轻量格式化展示即可
  return value.replace('T', ' ').slice(0, 19)
}

async function copyLink(asset: AssetItem) {
  const url = resolveFileUrl(asset.fileUrl)
  try {
    await navigator.clipboard.writeText(url)
    jumpHint.value = '已复制预览链接。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制预览链接。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}

async function handleDelete(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认删除该资产？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await deleteAsset(asset.assetId)
    assets.value = assets.value.filter((a) => a.assetId !== asset.assetId)
    if (highlightedId.value === asset.assetId) {
      highlightedId.value = null
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    loading.value = false
  }
}

function openMetadata(asset: AssetItem) {
  metadataModalOpen.value = true
  metadataTitle.value = `${asset.fileName}（${asset.assetType} · ${asset.sourceType}）`
  metadataLink.value = resolveFileUrl(asset.fileUrl)
  metadataPretty.value = prettyJson(asset.metadataJson || '')
}

function closeMetadata() {
  metadataModalOpen.value = false
  metadataPretty.value = ''
  metadataTitle.value = ''
  metadataLink.value = '#'
}

function prettyJson(input: string) {
  if (!input || !input.trim()) {
    return ''
  }
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return input
  }
}

async function copyMetadata() {
  if (!metadataPretty.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(metadataPretty.value)
    jumpHint.value = '已复制 metadataJson。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制 metadataJson。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}
</script>

<style scoped>
section.app-card {
  background: transparent;
}

.app-card-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.app-muted {
  font-size: 13px;
  color: #6b7280;
}

.app-selected-project {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fc;
  border-radius: 10px;
  padding: 12px 16px;
  border: 1px solid #eef0f6;
  color: #111827;
}

.asset-count {
  margin-left: 6px;
  font-size: 12px;
  color: #6b7280;
}

.asset-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-scope-segment {
  display: inline-flex;
  margin-top: 12px;
  padding: 3px;
  border-radius: 10px;
  background: #eef0f6;
  border: 1px solid #e5e7eb;
  gap: 2px;
}

.asset-scope-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease;
}

.asset-scope-btn:hover:not(:disabled) {
  color: #111827;
  background: rgba(255, 255, 255, 0.65);
}

.asset-scope-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.asset-scope-btn-active {
  color: #111827;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.asset-type-select {
  height: 36px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #111827;
  padding: 0 12px;
  border-radius: 8px;
  outline: none;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.asset-type-select:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.1);
  background: #ffffff;
}

.asset-search {
  width: 220px;
  height: 36px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #111827;
  padding: 0 12px 0 36px;
  border-radius: 8px;
  outline: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M11 19a8 8 0 110-16 8 8 0 010 16z' stroke='%239CA3AF' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.asset-search:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.1);
  background: #ffffff;
}

.app-file-list {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  min-height: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.app-file-item {
  border-radius: 12px;
  border: 1px solid #f0f1f3;
  background: #fafafb;
}

.asset-row-main {
  flex: 1;
  min-width: 0;
}

.asset-row-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row-meta {
  margin: 6px 0 10px;
  font-size: 13px;
  color: #6b7280;
}

.asset-row-actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.asset-row-preview img {
  width: 240px;
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.asset-row-preview audio,
.asset-row-preview video {
  width: 320px;
  max-width: 100%;
}

.asset-open {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.asset-danger {
  border-color: rgba(239, 68, 68, 0.45);
  color: #ef4444;
}

.asset-row-highlight {
  outline: 2px solid #7c6cff;
  outline-offset: 2px;
  border-radius: var(--app-radius-sm);
  background: rgba(124, 108, 255, 0.08);
}

.asset-jump-hint {
  margin: 8px 0 0;
  font-size: 13px;
}

.asset-empty {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  min-height: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  margin-top: 0;
  padding-top: 80px;
  gap: 10px;
}

.asset-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.asset-empty-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.asset-empty-action {
  margin-top: 12px;
  height: 42px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6c5ce7, #8a7cff);
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition:
    opacity 120ms ease,
    transform 120ms ease,
    box-shadow 120ms ease;
}

.asset-empty-action:hover {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(124, 108, 255, 0.22);
}

.asset-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 60;
}

.asset-modal {
  width: min(920px, 100%);
  max-height: min(78vh, 720px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.92);
  padding: 14px 14px 12px;
}

.asset-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.asset-modal-subtitle {
  margin: 8px 0 10px;
  font-size: 13px;
}

.asset-modal-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(2, 6, 23, 0.55);
  color: rgba(226, 232, 240, 0.95);
}

.asset-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}
</style>

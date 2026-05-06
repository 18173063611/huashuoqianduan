<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">资产中心</h2>
        <p class="app-muted">查看已保存的全局资产。</p>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading" @click="loadAssets">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <template>
      <div class="app-selected-project">全局资产 · <strong>所有模块保存的内容</strong></div>
      <p v-if="jumpHint" class="asset-jump-hint app-muted">{{ jumpHint }}</p>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="assets.length === 0" class="app-empty">暂无资产。</div>
      <div v-else class="app-file-list">
        <div
          v-for="asset in assets"
          :id="assetRowDomId(asset.assetId)"
          :key="asset.assetId"
          class="app-file-item"
          :class="{ 'asset-row-highlight': highlightedId === asset.assetId }"
        >
          <div>
            <strong>{{ asset.fileName }}</strong>
            <p>{{ asset.assetType }} - {{ formatFileSize(asset.fileSize) }} - {{ asset.sourceType }}</p>
          </div>
          <a :href="resolveFileUrl(asset.fileUrl)" target="_blank" rel="noreferrer">预览</a>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getAssets } from '../../services/assetApi'
import type { AssetItem } from '../../types/assetTypes'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '')

const props = defineProps<{
  /** 从任务中心等入口跳转时高亮并滚动到该资产 */
  highlightAssetId?: number | null
}>()

const emit = defineEmits<{
  highlightConsumed: []
}>()

const assets = ref<AssetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const highlightedId = ref<number | null>(null)
const jumpHint = ref('')
let highlightClearTimer: number | null = null

watch(
  () => true,
  async () => {
    assets.value = []
    highlightedId.value = null
    jumpHint.value = ''
    clearHighlightTimer()
    await loadAssets()
  },
  { immediate: true },
)

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
})

async function loadAssets() {
  loading.value = true
  errorMessage.value = ''
  try {
    assets.value = await getAssets()
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

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.asset-row-highlight {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
  border-radius: var(--app-radius-sm);
  background: var(--app-primary-soft);
}

.asset-jump-hint {
  margin: 8px 0 0;
  font-size: 13px;
}
</style>

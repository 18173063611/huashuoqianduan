<template>
  <div class="asset-picker">
    <div class="asset-picker-head">
      <div class="asset-picker-title">
        <strong>{{ title }}</strong>
        <p>{{ selectedLabel || emptyLabel }}</p>
      </div>
      <button class="asset-picker-button" type="button" :disabled="busy" @click="loadAssets">
        {{ busy ? '加载中' : '刷新' }}
      </button>
    </div>

    <div class="asset-picker-search">
      <input v-model.trim="keyword" :disabled="busy" :placeholder="placeholder" @keydown.enter="loadAssets" />
      <button class="asset-picker-button" type="button" :disabled="busy" @click="loadAssets">搜索</button>
    </div>

    <div v-if="errorMessage" class="app-error">{{ errorMessage }}</div>
    <div v-else-if="!busy && assets.length === 0" class="asset-picker-empty">暂无可选资产</div>

    <div v-else class="asset-picker-list">
      <button
        v-for="asset in assets"
        :key="asset.assetId"
        class="asset-picker-item"
        :class="{ active: selectedAssetId === asset.assetId }"
        type="button"
        :disabled="busy"
        @click="selectAsset(asset)"
      >
        <img v-if="isImage" :src="resolveUrl(asset.thumbnailUrl || asset.fileUrl)" alt="" />
        <span v-else class="asset-picker-icon">♪</span>
        <span class="asset-picker-meta">
          <strong>{{ asset.fileName }}</strong>
          <small>{{ asset.sourceType }} · {{ formatFileSize(asset.fileSize) }}</small>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAssets } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'

const props = defineProps<{
  title: string
  assetType: AssetType
  selectedUrl?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'select', payload: { asset: AssetItem; url: string }): void
}>()

const assets = ref<AssetItem[]>([])
const keyword = ref('')
const busy = ref(false)
const errorMessage = ref('')
const selectedAssetId = ref<number | null>(null)

const isImage = computed(() => props.assetType === 'IMAGE' || props.assetType === 'COVER')
const emptyLabel = computed(() => `从资产中心选择${isImage.value ? '图片' : '音频'}`)
const selectedLabel = computed(() => (props.selectedUrl ? `已选择：${props.selectedUrl}` : ''))

onMounted(loadAssets)

async function loadAssets() {
  busy.value = true
  errorMessage.value = ''
  try {
    assets.value = await getAssets({
      scope: 'all',
      assetType: props.assetType,
      keyword: keyword.value || undefined,
      sort: 'createdAtDesc',
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    busy.value = false
  }
}

function selectAsset(asset: AssetItem) {
  selectedAssetId.value = asset.assetId
  emit('select', { asset, url: resolveUrl(asset.fileUrl) })
}

function resolveUrl(url: string | null | undefined) {
  if (!url) {
    return ''
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
.asset-picker {
  display: grid;
  gap: 12px;
  border: 1px solid #e7eaf2;
  border-radius: 10px;
  background: #fbfcff;
  padding: 12px 14px 14px;
}

.asset-picker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.asset-picker-title {
  min-width: 0;
}

.asset-picker-title strong {
  display: block;
  color: #232838;
  font-size: 13px;
  font-weight: 800;
}

.asset-picker-title p {
  max-width: 720px;
  margin: 4px 0 0;
  overflow: hidden;
  color: #667085;
  font-size: 12.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.asset-picker-search input {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  font-size: 13px;
  outline: none;
}

.asset-picker-search input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.asset-picker-button {
  display: inline-flex;
  width: 72px;
  height: 36px;
  flex: 0 0 72px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.asset-picker-button:hover:not(:disabled) {
  border-color: #c8bfff;
  background: #faf9ff;
  color: #5e50df;
}

.asset-picker-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asset-picker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
  max-height: 248px;
  overflow: auto;
}

.asset-picker-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid #eef0f6;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
  color: #232838;
  text-align: left;
  cursor: pointer;
}

.asset-picker-item.active,
.asset-picker-item:hover:not(:disabled) {
  border-color: #bdb4ff;
  background: #faf9ff;
}

.asset-picker-item.active {
  box-shadow: inset 0 0 0 1px #d8d2ff;
}

.asset-picker-item img,
.asset-picker-icon {
  width: 44px;
  height: 44px;
  border-radius: 7px;
  background: #eef0f6;
  object-fit: cover;
}

.asset-picker-icon {
  display: grid;
  place-items: center;
  color: #635bff;
  font-size: 18px;
  font-weight: 900;
}

.asset-picker-meta {
  min-width: 0;
}

.asset-picker-meta strong,
.asset-picker-meta small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-meta strong {
  font-size: 12.5px;
}

.asset-picker-meta small,
.asset-picker-empty {
  color: #98a2b3;
  font-size: 12px;
}

@media (max-width: 640px) {
  .asset-picker-head {
    align-items: stretch;
    flex-direction: column;
  }

  .asset-picker-button {
    width: 100%;
    flex-basis: auto;
  }
}
</style>

<template>
  <div class="asset-picker-compact">
    <div class="asset-picker-summary">
      <strong>{{ title }}</strong>
      <p>{{ selectedLabel || emptyLabel }}</p>
    </div>
    <button class="asset-picker-open" type="button" :disabled="busy" @click="openPicker">
      {{ selectedLabel ? '更换' : '选择' }}
    </button>
  </div>

  <Teleport to="body">
    <div v-if="modalOpen" class="asset-picker-backdrop" @click.self="closePicker">
      <section class="asset-picker-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="asset-picker-modal-head">
          <div>
            <h2>{{ title }}</h2>
            <p>{{ emptyLabel }}</p>
          </div>
          <button class="asset-picker-button" type="button" @click="closePicker">关闭</button>
        </header>

        <div class="asset-picker-search">
          <input
            v-model.trim="keyword"
            :disabled="busy"
            :placeholder="placeholder"
            @keydown.enter.prevent="loadAssets"
          />
          <button class="asset-picker-button" type="button" :disabled="busy" @click="loadAssets">
            {{ busy ? '加载中' : '搜索' }}
          </button>
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
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
const selectedAssetName = ref('')
const modalOpen = ref(false)

const isImage = computed(() => props.assetType === 'IMAGE' || props.assetType === 'COVER')
const emptyLabel = computed(() => `从资产中心选择${isImage.value ? '图片' : '音频'}`)
const selectedLabel = computed(() => {
  if (selectedAssetName.value) {
    return `已选择：${selectedAssetName.value}`
  }
  return props.selectedUrl ? '已填写链接' : ''
})

watch(
  () => props.selectedUrl,
  (value) => {
    if (!value) {
      selectedAssetId.value = null
      selectedAssetName.value = ''
    }
  },
)

async function openPicker() {
  modalOpen.value = true
  await loadAssets()
}

function closePicker() {
  modalOpen.value = false
}

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
  selectedAssetName.value = asset.fileName
  emit('select', { asset, url: resolveUrl(asset.fileUrl) })
  closePicker()
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
.asset-picker-compact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 12px 14px;
}

.asset-picker-summary {
  min-width: 0;
}

.asset-picker-summary strong {
  display: block;
  color: #232838;
  font-size: 13px;
  font-weight: 800;
}

.asset-picker-summary p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #667085;
  font-size: 12.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-open,
.asset-picker-button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.asset-picker-open:hover:not(:disabled),
.asset-picker-button:hover:not(:disabled) {
  border-color: #c8bfff;
  background: #faf9ff;
  color: #5e50df;
}

.asset-picker-open:disabled,
.asset-picker-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asset-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
}

.asset-picker-modal {
  display: grid;
  width: min(820px, 100%);
  max-height: min(82vh, 680px);
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  padding: 16px;
  gap: 14px;
}

.asset-picker-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.asset-picker-modal-head h2 {
  margin: 0 0 4px;
  color: #151a2d;
  font-size: 17px;
  font-weight: 850;
}

.asset-picker-modal-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
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
  height: 38px;
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

.asset-picker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  min-height: 180px;
  overflow: auto;
  padding-right: 2px;
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

.asset-picker-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 1px dashed #dfe3ed;
  border-radius: 10px;
  background: #fbfcff;
}

@media (max-width: 640px) {
  .asset-picker-compact,
  .asset-picker-search {
    grid-template-columns: 1fr;
  }

  .asset-picker-modal-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

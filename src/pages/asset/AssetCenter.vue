<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <p class="app-eyebrow">资产中心</p>
        <h2>项目资产列表</h2>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading || !project" @click="loadAssets">
        {{ loading ? '加载中...' : '刷新资产' }}
      </button>
    </div>

    <div v-if="!project" class="app-empty">请先在项目管理中选择项目，资产会按 projectId 归档展示。</div>
    <template v-else>
      <div class="app-selected-project">当前项目：<strong>{{ project.projectName }}</strong></div>
      <p class="app-muted">上传完成后会自动写入 asset 表，后续 AI 生成的文案、音频、视频也复用这里。</p>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="assets.length === 0" class="app-empty">暂无资产。请先上传图片、音频、视频或文案文件。</div>
      <div v-else class="app-file-list">
        <div v-for="asset in assets" :key="asset.assetId" class="app-file-item">
          <div>
            <strong>{{ asset.fileName }}</strong>
            <p>{{ asset.assetType }} - {{ formatFileSize(asset.fileSize) }} - {{ asset.sourceType }}</p>
          </div>
          <a :href="asset.fileUrl" target="_blank" rel="noreferrer">预览</a>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getProjectAssets } from '../../services/assetApi'
import type { AssetItem } from '../../types/assetTypes'
import type { ProjectItem } from '../../types/projectTypes'

const props = defineProps<{
  project?: ProjectItem
}>()

const assets = ref<AssetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => props.project?.projectId,
  async () => {
    assets.value = []
    if (props.project) {
      await loadAssets()
    }
  },
  { immediate: true },
)

async function loadAssets() {
  if (!props.project) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    assets.value = await getProjectAssets(props.project.projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    loading.value = false
  }
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

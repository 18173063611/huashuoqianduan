<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">资产中心</h2>
        <p class="app-muted">查看当前项目资产。</p>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading || !project" @click="loadAssets">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="!project" class="app-empty">请先在「项目管理」中选择当前项目。</div>
    <template v-else>
      <div class="app-selected-project">当前项目 · <strong>{{ project.projectName }}</strong></div>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="assets.length === 0" class="app-empty">暂无资产。</div>
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

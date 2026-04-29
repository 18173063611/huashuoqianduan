<template>
  <section class="app-card app-form">
    <div>
      <h2 class="app-card-title">素材上传</h2>
      <p class="app-muted">上传图片、音视频或文案等素材；归档后可在资产中心查看与复用。</p>
    </div>

    <div v-if="!project" class="app-empty">请先在「项目管理」中选择当前项目，再上传素材。</div>
    <template v-else>
      <div class="app-selected-project">当前项目 · <strong>{{ project.projectName }}</strong></div>
      <input type="file" @change="handleFileChange" />
      <button class="app-primary-button" type="button" :disabled="!selectedFile || loading" @click="handleUpload">
        {{ loading ? '上传中...' : '上传文件' }}
      </button>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div class="app-file-list">
        <div v-for="file in files" :key="file.fileId" class="app-file-item">
          <div>
            <strong>{{ file.originalFileName }}</strong>
            <p>{{ formatFileSize(file.fileSize) }} - {{ file.mimeType || '未知类型' }}</p>
          </div>
          <a :href="file.previewUrl" target="_blank" rel="noreferrer">预览</a>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getProjectFiles, uploadProjectFile } from '../../services/uploadApi'
import type { ProjectItem } from '../../types/projectTypes'
import type { UploadedFileItem } from '../../types/uploadTypes'

const props = defineProps<{
  project?: ProjectItem
}>()

const files = ref<UploadedFileItem[]>([])
const selectedFile = ref<File>()
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => props.project?.projectId,
  async (projectId) => {
    // 切换项目时清空旧文件状态，避免把上一个项目的素材误展示到当前项目。
    files.value = []
    selectedFile.value = undefined
    if (projectId) {
      await loadFiles(projectId)
    }
  },
  { immediate: true },
)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0]
}

async function handleUpload() {
  if (!props.project || !selectedFile.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    // 上传成功后立即刷新文件列表，保证页面展示和后端落库结果一致。
    await uploadProjectFile(props.project.projectId, selectedFile.value)
    await loadFiles(props.project.projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '上传失败'
  } finally {
    loading.value = false
  }
}

async function loadFiles(projectId: number) {
  try {
    files.value = await getProjectFiles(projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载文件列表失败'
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
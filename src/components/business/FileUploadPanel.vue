<template>
  <section class="app-card app-form">
    <div>
      <p class="app-eyebrow">Upload API</p>
      <h2>Upload Project Materials</h2>
      <p class="app-muted">Images, audio, video, and script files can be uploaded to the local demo storage.</p>
    </div>

    <div v-if="!project" class="app-empty">Select a project before uploading files.</div>
    <template v-else>
      <div class="app-selected-project">
        Current project: <strong>{{ project.projectName }}</strong>
      </div>
      <input type="file" @change="handleFileChange" />
      <button class="app-primary-button" type="button" :disabled="!selectedFile || loading" @click="handleUpload">
        {{ loading ? 'Uploading...' : 'Upload File' }}
      </button>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div class="app-file-list">
        <div v-for="file in files" :key="file.fileId" class="app-file-item">
          <div>
            <strong>{{ file.originalFileName }}</strong>
            <p>{{ formatFileSize(file.fileSize) }} - {{ file.mimeType || 'Unknown type' }}</p>
          </div>
          <a :href="file.previewUrl" target="_blank" rel="noreferrer">Preview</a>
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
    errorMessage.value = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    loading.value = false
  }
}

async function loadFiles(projectId: number) {
  try {
    files.value = await getProjectFiles(projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Load files failed'
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
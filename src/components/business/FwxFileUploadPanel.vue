<template>
  <section class="fwx-card fwx-form">
    <div>
      <p class="fwx-eyebrow">文件上传基础能力</p>
      <h2>上传项目素材</h2>
      <p class="fwx-muted">图片、音频、视频和文案文件都可以先进入本地上传演示目录。</p>
    </div>

    <div v-if="!project" class="fwx-empty">请先选择一个项目，再上传文件。</div>
    <template v-else>
      <div class="fwx-selected-project">
        当前项目：<strong>{{ project.projectName }}</strong>
      </div>
      <input type="file" @change="handleFileChange" />
      <button class="fwx-primary-button" type="button" :disabled="!selectedFile || loading" @click="handleUpload">
        {{ loading ? '上传中...' : '上传文件' }}
      </button>
      <p v-if="errorMessage" class="fwx-error">{{ errorMessage }}</p>

      <div class="fwx-file-list">
        <div v-for="file in files" :key="file.fileId" class="fwx-file-item">
          <div>
            <strong>{{ file.originalFileName }}</strong>
            <p>{{ formatFileSize(file.fileSize) }} · {{ file.mimeType || '未知类型' }}</p>
          </div>
          <a :href="file.previewUrl" target="_blank" rel="noreferrer">预览</a>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { fwxGetProjectFiles, fwxUploadProjectFile } from '../../services/fwxUploadApi'
import type { FwxProjectItem } from '../../types/fwxProjectTypes'
import type { FwxUploadedFileItem } from '../../types/fwxUploadTypes'

const props = defineProps<{
  project?: FwxProjectItem
}>()

const files = ref<FwxUploadedFileItem[]>([])
const selectedFile = ref<File>()
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => props.project?.projectId,
  async (projectId) => {
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
    await fwxUploadProjectFile(props.project.projectId, selectedFile.value)
    await loadFiles(props.project.projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '上传失败'
  } finally {
    loading.value = false
  }
}

async function loadFiles(projectId: number) {
  try {
    files.value = await fwxGetProjectFiles(projectId)
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

<template>
  <div class="image-input" :class="{ 'image-input-compact': compact }">
    <label v-if="label" class="image-input-label">{{ label }}</label>

    <div class="image-input-row">
      <label class="image-input-file" :class="{ 'is-disabled': busy || uploading }">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,image/gif"
          :disabled="busy || uploading"
          @change="handleFileChange"
        />
        <span class="image-input-cta">{{ uploading ? '上传中…' : '上传本地图片' }}</span>
        <span class="image-input-meta">
          {{ fileLabel }}
        </span>
      </label>
    </div>

    <div v-if="value" class="image-input-preview">
      <img :src="value" alt="preview" referrerpolicy="no-referrer" />
      <button type="button" class="image-input-clear" :disabled="busy" @click="clear">移除</button>
    </div>

    <p v-if="errorMessage" class="app-error image-input-error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { uploadFile } from '../../services/uploadApi'

const props = defineProps<{
  label?: string
  value: string
  busy?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

// 上传接口返回的 previewUrl 是相对路径，需要拼上 TOS 桶域名才是公网可访问地址
const uploading = ref(false)
const errorMessage = ref('')
const lastFileName = ref('')

const fileLabel = computed(() => {
  if (uploading.value) {
    return '上传中…'
  }
  if (lastFileName.value) {
    return lastFileName.value
  }
  return '尚未选择文件'
})

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  lastFileName.value = file.name
  uploading.value = true
  errorMessage.value = ''
  try {
    const uploaded = await uploadFile(file)
    // 后端 /uploads 接口返回的 previewUrl 是 TOS 桶里的相对路径，
    // 必须拼上桶域名才是公网可访问的地址，否则火山方舟拉不到图片。
    const fullUrl = `${uploaded.previewUrl}`
    emit('update', fullUrl)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '图片上传失败'
  } finally {
    uploading.value = false
    // 重置 input，让用户可以重新选择同一个文件
    input.value = ''
  }
}

function clear() {
  emit('update', '')
  lastFileName.value = ''
  errorMessage.value = ''
}

void props
</script>

<style scoped>
.image-input {
  display: grid;
  gap: 8px;
}

.image-input-compact {
  gap: 6px;
}

.image-input-label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 800;
}

.image-input-row {
  min-width: 0;
}

.image-input-file {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px dashed #d8d2ff;
  border-radius: 8px;
  background: #fbfaff;
  cursor: pointer;
}

.image-input-file.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-input-file input[type='file'] {
  display: none;
}

.image-input-cta {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  background: #563bf0;
  color: #fff;
  font-size: 12.5px;
  font-weight: 800;
  white-space: nowrap;
}

.image-input-meta {
  min-width: 0;
  overflow: hidden;
  color: #5c6477;
  font-size: 12.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-input-preview {
  position: relative;
  width: 180px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #edf0f6;
  background: #f7f8fc;
}

.image-input-preview img {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: contain;
}

.image-input-clear {
  position: absolute;
  top: 6px;
  right: 6px;
  height: 24px;
  padding: 0 8px;
  border: none;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.image-input-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-input-error {
  margin: 0;
}
</style>

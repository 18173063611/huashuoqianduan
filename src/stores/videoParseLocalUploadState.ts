import { ref } from 'vue'
import { uploadFile } from '../services/uploadApi'
import { normalizePublicMediaUrl } from '../utils/mediaUrl'

export const uploadingLocalVideo = ref(false)
export const localVideoFileName = ref('')
export const localVideoPreviewUrl = ref('')
export const localVideoFilePath = ref('')
export const localUploadError = ref('')
export const localUploadMessage = ref('')
export const localUploadProgressPercent = ref<number | null>(null)
export const localUploadProgressText = ref('')

let uploadSeq = 0
let uploadAbort: AbortController | null = null

export function resetVideoParseLocalUpload(options: { abort?: boolean } = {}) {
  if (options.abort) {
    cancelVideoParseLocalUpload()
  } else {
    uploadSeq += 1
  }
  localVideoFileName.value = ''
  localVideoPreviewUrl.value = ''
  localVideoFilePath.value = ''
  localUploadError.value = ''
  localUploadMessage.value = ''
  localUploadProgressPercent.value = null
  localUploadProgressText.value = ''
}

export function clearVideoParseLocalUploadNotice() {
  localUploadError.value = ''
  localUploadMessage.value = ''
}

export function cancelVideoParseLocalUpload() {
  uploadSeq += 1
  if (uploadAbort) {
    uploadAbort.abort()
    uploadAbort = null
  }
  uploadingLocalVideo.value = false
  localVideoPreviewUrl.value = ''
  localVideoFilePath.value = ''
  localUploadMessage.value = ''
  localUploadError.value = localVideoFileName.value ? '已取消上传' : ''
  localUploadProgressPercent.value = null
  localUploadProgressText.value = ''
}

export function startVideoParseLocalUpload(file: File, displayName: string) {
  uploadSeq += 1
  const requestId = uploadSeq
  uploadAbort?.abort()

  const controller = new AbortController()
  uploadAbort = controller

  localVideoFileName.value = displayName
  localVideoPreviewUrl.value = ''
  localVideoFilePath.value = ''
  localUploadError.value = ''
  localUploadMessage.value = ''
  localUploadProgressPercent.value = 0
  localUploadProgressText.value = '准备上传'
  uploadingLocalVideo.value = true

  void uploadFile(file, {
    signal: controller.signal,
    storage: 'local',
    onProgress(progress) {
      if (requestId !== uploadSeq) {
        return
      }
      localUploadProgressPercent.value = progress.percent
      localUploadProgressText.value =
        progress.phase === 'processing'
          ? '上传完成，正在保存视频'
          : progress.percent == null
            ? '正在上传视频'
            : `正在上传视频 ${progress.percent}%`
    },
  })
    .then((uploaded) => {
      if (requestId !== uploadSeq) {
        return
      }
      localVideoPreviewUrl.value = normalizePublicMediaUrl(uploaded.previewUrl)
      localVideoFilePath.value = uploaded.filePath || ''
      localUploadMessage.value = `${uploaded.originalFileName || file.name} 已上传，可开始解析`
      localUploadProgressPercent.value = 100
      localUploadProgressText.value = ''
    })
    .catch((error) => {
      if (requestId !== uploadSeq) {
        return
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        localUploadError.value = localVideoFileName.value ? '已取消上传' : ''
      } else {
        localUploadError.value = error instanceof Error ? error.message : '上传失败'
      }
      localVideoPreviewUrl.value = ''
      localVideoFilePath.value = ''
      localUploadMessage.value = ''
      localUploadProgressPercent.value = null
      localUploadProgressText.value = ''
    })
    .finally(() => {
      if (requestId !== uploadSeq) {
        return
      }
      uploadingLocalVideo.value = false
      if (uploadAbort === controller) {
        uploadAbort = null
      }
    })
}

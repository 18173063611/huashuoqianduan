<template>
  <div class="storyboard-page app-page-stack">
    <section class="app-card storyboard-input">
        <div class="app-section-title">
          <span>1</span>
          <div>
            <h2>选择视频来源</h2>
            <p class="app-muted">
              支持两种方式：粘贴爆款对标同款平台链接或公网视频直链 / 选择本地文件先上传再解析。建议视频不超过 50MB，否则模型可能解析失败。
            </p>
          </div>
        </div>

        <BillingEstimateBanner
          :estimated-credit-cost="storyboardEstimate.estimatedCreditCost.value"
          :balance="storyboardEstimate.balance.value"
          :loading="storyboardEstimate.loading.value"
          :steps="storyboardEstimate.steps.value"
        />

        <div class="storyboard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            :class="{ active: sourceMode === 'url' }"
            :aria-selected="sourceMode === 'url'"
            :disabled="busy || uploadingFile"
            @click="sourceMode = 'url'"
          >
            视频链接
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: sourceMode === 'file' }"
            :aria-selected="sourceMode === 'file'"
            :disabled="busy || uploadingFile"
            @click="sourceMode = 'file'"
          >
            上传本地文件
          </button>
        </div>

        <div v-if="sourceMode === 'url'" class="storyboard-source storyboard-source-url">
          <div class="storyboard-platforms" role="group" aria-label="视频平台">
            <button
              v-for="option in platformOptions"
              :key="option.value"
              type="button"
              :class="{ active: selectedPlatform === option.value }"
              :disabled="busy"
              @click="selectedPlatform = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <input
            v-model.trim="videoUrl"
            type="url"
            :placeholder="videoPlaceholder"
            :disabled="busy"
          />
          <p v-if="selectedPlatformLimitReason" class="storyboard-platform-limit">
            {{ selectedPlatformLimitReason }}
          </p>

          <div class="storyboard-actions">
            <button
              class="app-primary-button"
              type="button"
              :disabled="!canAnalyzeUrl || busy || !!selectedPlatformLimitReason || !!storyboardEstimate.insufficientHint.value"
              :title="selectedPlatformLimitReason || storyboardEstimate.insufficientHint.value || ''"
              @click="handleAnalyzeUrl"
            >
              {{ busyLabel }}
            </button>
            <button
              v-if="busy || cancelingAnalyze"
              class="app-secondary-button storyboard-cancel-button"
              type="button"
              :disabled="cancelingAnalyze"
              @click="cancelAnalyzeTask"
            >
              {{ cancelingAnalyze ? '取消中...' : '取消解析' }}
            </button>
            <button
              v-if="shots.length || errorMessage"
              class="app-secondary-button"
              type="button"
              :disabled="busy"
              @click="resetResult"
            >
              重新开始
            </button>
          </div>
        </div>

        <div v-else class="storyboard-source storyboard-source-file">
          <label class="storyboard-file-picker" :class="{ 'is-disabled': busy || uploadingFile }">
            <input ref="fileInputRef" type="file" accept="video/*" :disabled="busy || uploadingFile" @change="handleFileChange" />
            <span class="storyboard-file-cta">选择视频文件</span>
            <span class="storyboard-file-meta" :title="selectedFile ? selectedFile.name : ''">
              {{ selectedFile ? `${selectedFile.name}（${formatFileSize(selectedFile.size)}）` : '尚未选择文件' }}
            </span>
          </label>

          <div
            v-if="uploadProgressPercent !== null || uploadProgressText"
            class="storyboard-upload-progress"
            aria-live="polite"
          >
            <div class="storyboard-upload-progress-track">
              <span
                class="storyboard-upload-progress-fill"
                :style="{ width: `${uploadProgressPercent ?? 12}%` }"
              />
            </div>
            <span>{{ uploadProgressText || '上传完成' }}</span>
          </div>

          <div class="storyboard-actions">
            <button
              class="app-primary-button"
              type="button"
              :disabled="!canAnalyzeFile || busy || uploadingFile || !!storyboardEstimate.insufficientHint.value"
              :title="storyboardEstimate.insufficientHint.value ?? ''"
              @click="handleAnalyzeFile"
            >
              {{ busyLabel }}
            </button>
            <button
              v-if="uploadingFile"
              class="app-secondary-button storyboard-cancel-button"
              type="button"
              @click="cancelUpload"
            >
              取消上传
            </button>
            <button
              v-if="busy || cancelingAnalyze"
              class="app-secondary-button storyboard-cancel-button"
              type="button"
              :disabled="cancelingAnalyze"
              @click="cancelAnalyzeTask"
            >
              {{ cancelingAnalyze ? '取消中...' : '取消解析' }}
            </button>
            <button
              v-if="shots.length || errorMessage"
              class="app-secondary-button"
              type="button"
              :disabled="busy"
              @click="resetResult"
            >
              重新开始
            </button>
          </div>
        </div>

        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
      </section>

      <section class="app-card storyboard-result">
        <div class="app-section-title">
          <span>2</span>
          <div>
            <h2>分镜解析结果</h2>
            <p class="app-muted">按时间顺序列出每个分镜的画面、台词与拍摄技巧，可直接复制台词进入下一步音频生成。</p>
          </div>
        </div>

        <div v-if="(busy || uploadingFile) && stage" class="storyboard-status">
          <span class="storyboard-status-dot" />
          {{ stage }}
        </div>

        <div v-if="!shots.length && !busy" class="storyboard-empty">
          <div class="storyboard-empty-panel">
            <span class="storyboard-empty-icon">▤</span>
            <strong>等待解析结果</strong>
            <p>解析后将在这里呈现镜头画面、台词与拍摄技巧。</p>
            <div class="storyboard-empty-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div v-else-if="shots.length" class="storyboard-table-wrap">
          <table class="storyboard-table">
            <thead>
              <tr>
                <th class="col-order">场景序号</th>
                <th class="col-example">示例</th>
                <th class="col-summary">场景概述</th>
                <th class="col-dialogue">
                  <div class="storyboard-th-with-help">
                    <span>台词</span>
                    <span class="storyboard-help" title="模型推断的口播 / 旁白 / 字幕，可直接复制">?</span>
                  </div>
                </th>
                <th class="col-tips">拍摄技巧</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shot in shots" :key="shot.order">
                <td class="col-order">场景{{ orderLabel(shot.order) }}</td>
                <td class="col-example">
                  <div class="storyboard-thumb">
                    <video
                      v-if="analyzedVideoUrl"
                      :src="thumbVideoSrc(shot)"
                      preload="metadata"
                      muted
                      playsinline
                    />
                    <span v-else class="storyboard-thumb-placeholder" aria-hidden="true">▶</span>
                    <span class="storyboard-thumb-time">{{ formatTime(shot.time) }}</span>
                  </div>
                </td>
                <td class="col-summary">
                  <textarea
                    v-model="shot.page"
                    class="storyboard-edit storyboard-edit-summary"
                    rows="3"
                    placeholder="场景概述"
                  />
                  <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="storyboard-bgm">
                    <span aria-hidden="true">♪</span>
                    {{ shot.backgroundMusic }}
                  </p>
                </td>
                <td class="col-dialogue">
                  <textarea
                    v-model="shot.content"
                    class="storyboard-edit storyboard-edit-dialogue"
                    :class="{ 'is-empty': !hasContent(shot) }"
                    rows="4"
                    :placeholder="hasContent(shot) ? '台词' : '当前场景暂无台词'"
                  />
                </td>
                <td class="col-tips">
                  <textarea
                    v-model="shot.highlight"
                    class="storyboard-edit storyboard-edit-tips"
                    rows="3"
                    placeholder="拍摄技巧"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { uploadFile } from '../../services/uploadApi'
import { analyzeVideoScript, analyzeVideoScriptByUrl } from '../../services/videoApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { cancelTask } from '../../services/taskApi'
import { trackTaskResult } from '../../services/taskRealtime'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import type { VideoScriptAnalyzeResult, VideoScriptShotItem } from '../../types/videoTypes'
import type { TaskItem } from '../../types/taskTypes'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { notifyAuthRefresh } from '../../services/authRefreshHub'

type SourceMode = 'url' | 'file'

type StoryboardPlatformOption = {
  value: string
  label: string
  placeholder: string
  limitReason?: string
}

const platformOptions: StoryboardPlatformOption[] = [
  {
    value: 'auto',
    label: '自动',
    placeholder: '粘贴抖音 / 小红书 / 视频号 / TikTok / 快手 / B站 / YouTube 等视频链接',
  },
  {
    value: 'douyin',
    label: '抖音',
    placeholder: '粘贴抖音分享链接或完整分享文案',
  },
  {
    value: 'xiaohongshu',
    label: '小红书',
    placeholder: '粘贴小红书完整分享文案或 http(s) 链接',
  },
  {
    value: 'wechat_channels',
    label: '视频号',
    placeholder: '粘贴微信视频号分享链接，例如 https://weixin.qq.com/sph/...',
    limitReason:
      '微信视频号暂不支持链接解析：视频号内容通常依赖微信登录、客户端上下文或平台授权，官方没有开放任意公开视频下载解析接口。请改用本地上传视频文件。',
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    placeholder: '粘贴 TikTok 视频链接',
  },
  {
    value: 'kuaishou',
    label: '快手',
    placeholder: '粘贴快手分享链接或完整分享文案',
  },
  {
    value: 'bilibili',
    label: 'B站',
    placeholder: '粘贴 B 站视频链接',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    placeholder: '粘贴 YouTube 视频链接',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    placeholder: '粘贴 Facebook 公开视频链接',
    limitReason:
      'Facebook 暂不支持链接解析：公开视频常受登录、地区、隐私权限和防下载策略限制，官方也不提供任意视频下载接口。请改用本地上传视频文件或可直接访问的视频直链。',
  },
]

const sourceMode = ref<SourceMode>('url')
const selectedPlatform = ref('auto')

// 与 WriterAsyncTaskService 一致：链接 -> VIDEO_SCRIPT_URL_ANALYZE，上传解析 -> VIDEO_SCRIPT_ANALYZE。
const storyboardEstimate = useBillingEstimate({
  taskType: () =>
    sourceMode.value === 'url' ? 'VIDEO_SCRIPT_URL_ANALYZE' : 'VIDEO_SCRIPT_ANALYZE',
  watchKeys: () => [sourceMode.value],
})
const videoUrl = ref('')
const selectedFile = ref<File | null>(null)
const uploadedPreviewUrl = ref('')
const analyzedVideoUrl = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const shots = ref<VideoScriptShotItem[]>([])
const errorMessage = ref('')
const stage = ref('')
const busy = ref(false)
const cancelingAnalyze = ref(false)
const uploadingFile = ref(false)
const uploadProgressPercent = ref<number | null>(null)
const uploadProgressText = ref('')
let stopAnalyzeTracking: (() => void) | null = null
let uploadRequestId = 0
let uploadAbort: AbortController | null = null
let analyzeAbort: AbortController | null = null
let analyzeRunSeq = 0
let currentAnalyzeTaskId: number | null = null

onBeforeUnmount(() => {
  analyzeAbort?.abort()
  stopAnalyzeTask()
  uploadAbort?.abort()
})

const busyLabel = computed(() => {
  if (uploadingFile.value) {
    return uploadProgressText.value || '上传中…'
  }
  if (!busy.value) {
    return '开始解析'
  }
  return stage.value || '处理中…'
})

const canAnalyzeUrl = computed(() => Boolean(videoUrl.value))
const canAnalyzeFile = computed(() => Boolean(selectedFile.value && uploadedPreviewUrl.value))
const videoPlaceholder = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.placeholder || platformOptions[0].placeholder,
)
const selectedPlatformLimitReason = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.limitReason || '',
)

const ORDER_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function orderLabel(order: number) {
  if (order >= 1 && order <= ORDER_CN.length) {
    return ORDER_CN[order - 1]
  }
  return String(order)
}

function hasContent(shot: VideoScriptShotItem) {
  const text = (shot.content || '').trim()
  return text.length > 0 && text !== '无'
}

function formatTime(time: string) {
  if (!time) {
    return ''
  }
  // 后端返回类似 "00:00:03-00:00:08"，截掉小时段后更紧凑
  const [start] = time.split('-')
  const parts = start.split(':')
  if (parts.length === 3 && parts[0] === '00') {
    return `${parts[1]}:${parts[2]}`
  }
  return start
}

function thumbVideoSrc(shot: VideoScriptShotItem) {
  if (!analyzedVideoUrl.value) {
    return ''
  }
  const seconds = parseStartSeconds(shot.time)
  // 用媒体片段语法定位到分镜起始秒，浏览器会取该帧作为预览
  return seconds > 0 ? `${analyzedVideoUrl.value}#t=${seconds}` : analyzedVideoUrl.value
}

function parseStartSeconds(time: string) {
  if (!time) {
    return 0
  }
  const [start] = time.split('-')
  const parts = start.split(':').map((part) => Number(part) || 0)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
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

watch(videoUrl, (value) => {
  if (sourceMode.value !== 'url') {
    return
  }
  const detected = detectPlatformFromText(value)
  if (detected && selectedPlatform.value !== detected) {
    selectedPlatform.value = detected
  }
})

watch(sourceMode, (mode) => {
  if (mode !== 'url' || !uploadingFile.value) {
    return
  }
  cancelUpload()
})

function detectPlatformFromText(value: string) {
  const text = value.toLowerCase()
  if (!text.trim()) return ''
  if (/douyin\.com|iesdouyin\.com|amemv\.com|douyinvod\.com/.test(text)) return 'douyin'
  if (/xiaohongshu\.com|xhslink\.com|xhscdn\.com|xhs\.cn/.test(text)) return 'xiaohongshu'
  if (/weixin\.qq\.com\/sph|channels\.weixin\.qq\.com|finder\.video\.qq\.com|finder\.video\.wechat\.com/.test(text)) return 'wechat_channels'
  if (/tiktok\.com|tiktokv\.com|vm\.tiktok\.com|vt\.tiktok\.com|musical\.ly/.test(text)) return 'tiktok'
  if (/kuaishou\.com|kwai\.com|gifshow\.com|kwaicdn\.com|ksapisrv\.com|oskwai\.com|yximgs\.com/.test(text)) return 'kuaishou'
  if (/bilibili\.com|b23\.tv|bilivideo\.com|hdslb\.com|biliimg\.com/.test(text)) return 'bilibili'
  if (/youtube\.com|youtu\.be|googlevideo\.com/.test(text)) return 'youtube'
  if (/facebook\.com|fb\.watch|fbcdn\.net|fb\.com/.test(text)) return 'facebook'
  return ''
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const currentRequestId = ++uploadRequestId
  uploadAbort?.abort()
  selectedFile.value = file
  uploadedPreviewUrl.value = ''
  errorMessage.value = ''
  uploadProgressPercent.value = null
  uploadProgressText.value = ''

  if (!file) {
    stage.value = ''
    return
  }

  const controller = new AbortController()
  uploadAbort = controller
  uploadingFile.value = true
  uploadProgressPercent.value = 0
  uploadProgressText.value = '准备上传'
  stage.value = '准备上传视频…'

  try {
    const uploaded = await uploadFile(file, {
      signal: controller.signal,
      storage: 'local',
      onProgress(progress) {
        if (currentRequestId !== uploadRequestId) {
          return
        }
        uploadProgressPercent.value = progress.percent
        uploadProgressText.value =
          progress.phase === 'processing'
            ? '上传完成，正在保存视频'
            : progress.percent == null
              ? '正在上传视频'
              : `正在上传视频 ${progress.percent}%`
        stage.value = uploadProgressText.value
      },
    })
    if (currentRequestId !== uploadRequestId) {
      return
    }
    uploadedPreviewUrl.value = normalizePublicMediaUrl(uploaded.previewUrl)
    uploadProgressPercent.value = 100
    uploadProgressText.value = ''
    stage.value = ''
  } catch (error) {
    if (currentRequestId !== uploadRequestId) {
      return
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      errorMessage.value = ''
    } else {
      errorMessage.value = error instanceof Error ? error.message : '上传失败'
    }
    input.value = ''
    uploadProgressPercent.value = null
    uploadProgressText.value = ''
    stage.value = ''
  } finally {
    if (currentRequestId === uploadRequestId) {
      uploadingFile.value = false
      if (uploadAbort === controller) {
        uploadAbort = null
      }
    }
  }
}

function cancelUpload() {
  uploadRequestId += 1
  uploadAbort?.abort()
  uploadAbort = null
  uploadingFile.value = false
  uploadProgressPercent.value = null
  uploadProgressText.value = ''
  uploadedPreviewUrl.value = ''
  selectedFile.value = null
  stage.value = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function resetResult() {
  stopAnalyzeTask()
  shots.value = []
  errorMessage.value = ''
  stage.value = ''
  analyzedVideoUrl.value = ''
}

async function runAnalyze(submit: (signal: AbortSignal) => Promise<TaskItem>, targetUrl: string) {
  const runId = ++analyzeRunSeq
  stopAnalyzeTask()
  analyzeAbort?.abort()
  analyzeAbort = new AbortController()
  currentAnalyzeTaskId = null
  busy.value = true
  cancelingAnalyze.value = false
  errorMessage.value = ''
  shots.value = []
  analyzedVideoUrl.value = ''

  try {
    stage.value = '提交解析任务中…'
    const task = await submit(analyzeAbort.signal)
    if (runId !== analyzeRunSeq) {
      return
    }
    currentAnalyzeTaskId = task.taskId
    rememberSessionTaskId(task.taskId)
    void storyboardEstimate.refresh()
    notifyAuthRefresh()
    stage.value = statusStage(task.status, task.progress)
    await new Promise<void>((resolve) => {
      stopAnalyzeTracking = trackTaskResult<VideoScriptAnalyzeResult>(task.taskId, {
        onStatus(message) {
          if (runId !== analyzeRunSeq) {
            return
          }
          stage.value = statusStage(message.status, message.progress)
        },
        onResult(taskResult) {
          if (runId !== analyzeRunSeq) {
            return
          }
          const list = taskResult.result?.scripts || []
          shots.value = [...list].sort((a, b) => a.order - b.order)
          analyzedVideoUrl.value = targetUrl
          busy.value = false
          currentAnalyzeTaskId = null
          stage.value = ''
          void storyboardEstimate.refresh()
          notifyAuthRefresh()
          resolve()
        },
        onFailure(message) {
          if (runId !== analyzeRunSeq) {
            return
          }
          errorMessage.value = message.errorMessage || '分镜解析任务失败'
          busy.value = false
          currentAnalyzeTaskId = null
          stage.value = ''
          void storyboardEstimate.refresh()
          notifyAuthRefresh()
          resolve()
        },
        onError(error) {
          if (runId !== analyzeRunSeq) {
            return
          }
          errorMessage.value = error.message
          busy.value = false
          currentAnalyzeTaskId = null
          stage.value = ''
          void storyboardEstimate.refresh()
          notifyAuthRefresh()
          resolve()
        },
      })
    })
  } catch (error) {
    if (runId !== analyzeRunSeq) {
      return
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    errorMessage.value = error instanceof Error ? error.message : '解析失败'
    busy.value = false
    currentAnalyzeTaskId = null
    stage.value = ''
  }
}

async function cancelAnalyzeTask() {
  const taskId = currentAnalyzeTaskId
  analyzeRunSeq += 1
  analyzeAbort?.abort()
  analyzeAbort = null
  stopAnalyzeTask()
  currentAnalyzeTaskId = null
  busy.value = false
  stage.value = ''
  if (!taskId) {
    cancelingAnalyze.value = false
    return
  }
  cancelingAnalyze.value = true
  try {
    await cancelTask(taskId)
    void storyboardEstimate.refresh()
    notifyAuthRefresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '取消解析失败'
  } finally {
    cancelingAnalyze.value = false
  }
}

function stopAnalyzeTask() {
  if (stopAnalyzeTracking) {
    stopAnalyzeTracking()
    stopAnalyzeTracking = null
  }
}

function statusStage(status: string, progress: number | null) {
  if (status === 'QUEUED') {
    return '排队中…'
  }
  if (status === 'RUNNING') {
    return progress != null ? `解析分镜中… ${progress}%` : '解析分镜中…'
  }
  return '解析分镜中…'
}

function publicVideoUrl(url: string) {
  return normalizePublicMediaUrl(url)
}

async function handleAnalyzeUrl() {
  if (!canAnalyzeUrl.value || busy.value) {
    return
  }
  if (selectedPlatformLimitReason.value) {
    errorMessage.value = selectedPlatformLimitReason.value
    return
  }

  const targetUrl = videoUrl.value
  await runAnalyze((signal) => analyzeVideoScriptByUrl(targetUrl, selectedPlatform.value, { signal }), targetUrl)
}

async function handleAnalyzeFile() {
  if (!canAnalyzeFile.value || busy.value || uploadingFile.value) {
    return
  }

  try {
    const targetUrl = publicVideoUrl(uploadedPreviewUrl.value)
    if (!targetUrl) {
      throw new Error('请先选择并上传本地视频文件')
    }

    await runAnalyze((signal) => analyzeVideoScript(targetUrl, { signal }), targetUrl)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '解析失败'
    busy.value = false
    stage.value = ''
  }
}
</script>

<style scoped>
.storyboard-page {
  display: grid;
  width: 98%;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  margin-right: 10px;
  margin-left: 10px;
}

.storyboard-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 800;
}

.storyboard-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.storyboard-input,
.storyboard-result {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.storyboard-input {
  position: sticky;
  top: 92px;
}

.storyboard-result {
  min-height: 520px;
  width: auto;
}

.storyboard-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.storyboard-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.storyboard-tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.storyboard-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.storyboard-cancel-button {
  min-height: 40px;
  padding: 0 14px;
}

.storyboard-source {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.storyboard-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.storyboard-platforms button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dfe4f0;
  border-radius: 8px;
  background: #fff;
  color: #42526e;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.storyboard-platforms button.active {
  border-color: #715cff;
  background: #fbfaff;
  box-shadow: inset 0 0 0 1px rgba(113, 92, 255, 0.35);
  color: #563bf0;
}

.storyboard-platforms button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.storyboard-source-url input {
  width: 100%;
  height: 46px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  outline: none;
}

.storyboard-source-url input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.storyboard-platform-limit {
  margin: 0;
  border: 1px solid #ffd9a8;
  border-radius: 8px;
  background: #fff8ec;
  color: #9a5a12;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.6;
}

.storyboard-file-picker {
  display: flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px dashed #d8d2ff;
  border-radius: 8px;
  background: #fbfaff;
  cursor: pointer;
  width: 100%;
  overflow: hidden;
}

.storyboard-file-picker.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.storyboard-file-picker input[type='file'] {
  display: none;
}

.storyboard-file-cta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  background: #563bf0;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.storyboard-file-meta {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  color: #5c6477;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storyboard-upload-progress {
  display: grid;
  gap: 7px;
  padding: 9px 10px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: #fbfaff;
  color: #5e50df;
  font-size: 12.5px;
  font-weight: 800;
}

.storyboard-upload-progress-track {
  position: relative;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #eceff7;
}

.storyboard-upload-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 8px;
  border-radius: inherit;
  background: #715cff;
  transition: width 160ms ease;
}

.storyboard-hint {
  margin: 0;
  color: #98a2b3;
  font-size: 12.5px;
  line-height: 1.6;
}

.storyboard-hint a {
  color: #563bf0;
  font-weight: 800;
  word-break: break-all;
}

.storyboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.storyboard-actions .app-primary-button,
.storyboard-actions .app-secondary-button {
  min-width: 128px;
}

.storyboard-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.8);
  color: #5e50df;
  font-size: 13px;
  font-weight: 750;
}

.storyboard-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #8b7cf6;
  animation: storyboard-pulse 1.2s ease-in-out infinite;
}

@keyframes storyboard-pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.storyboard-empty {
  display: grid;
  min-height: 330px;
  place-items: center;
  border: 1px dashed #d8dce8;
  border-radius: 12px;
  background: #fbfcff;
  color: #667085;
}

.storyboard-empty-panel {
  display: grid;
  width: min(420px, 100%);
  justify-items: center;
  gap: 10px;
  text-align: center;
}

.storyboard-empty-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  font-size: 20px;
  font-weight: 850;
}

.storyboard-empty-panel strong {
  color: #2d3446;
  font-size: 15px;
}

.storyboard-empty-panel p {
  margin: 0;
  font-size: 13px;
}

.storyboard-empty-lines {
  display: grid;
  width: 100%;
  gap: 8px;
  margin-top: 8px;
}

.storyboard-empty-lines span {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: #eef1f7;
}

.storyboard-empty-lines span:nth-child(2) {
  width: 76%;
  justify-self: center;
}

.storyboard-empty-lines span:nth-child(3) {
  width: 58%;
  justify-self: center;
}

.storyboard-table-wrap {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fff;
}

.storyboard-table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13.5px;
  color: #2d3446;
}

.storyboard-table thead th {
  padding: 14px 16px;
  background: #f5f6fa;
  color: #5c6477;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  border-bottom: 1px solid #edf0f6;
}

.storyboard-table tbody td {
  padding: 18px 16px;
  border-bottom: 1px solid #edf0f6;
  vertical-align: top;
  line-height: 1.7;
}

.storyboard-table tbody tr:last-child td {
  border-bottom: 0;
}

.col-order {
  width: 110px;
  color: #2d3446;
  font-weight: 800;
}

.col-example {
  width: 168px;
}

.col-summary {
  width: 220px;
}

.col-dialogue {
  width: 260px;
}

.col-tips {
  width: auto;
}

.storyboard-th-with-help {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.storyboard-help {
  display: inline-grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 999px;
  background: #e7eaf2;
  color: #98a2b3;
  font-size: 11px;
  font-weight: 800;
  cursor: help;
}

.storyboard-thumb {
  position: relative;
  width: 132px;
  height: 96px;
  border-radius: 10px;
  background: #1f2230;
  overflow: hidden;
}

.storyboard-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.storyboard-thumb-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 28px;
}

.storyboard-thumb-time {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.storyboard-edit {
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #2d3446;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.storyboard-edit:hover {
  border-color: #e3e7ef;
  background: #fafbff;
}

.storyboard-edit:focus {
  border-color: #8f81ff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.storyboard-edit-summary {
  color: #2d3446;
  height: 150px;
  font-weight: 700;
}

.storyboard-edit-dialogue {
  height: 150px;
  color: #394053;
}

.storyboard-edit-dialogue.is-empty {
  color: #b6bdcc;
  font-style: italic;
}

.storyboard-edit-tips {
  color: #4c566a;
}

.storyboard-bgm {
  margin: 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  font-size: 12px;
  font-weight: 750;
}

@media (max-width: 900px) {
  .storyboard-page {
    grid-template-columns: 1fr;
  }

  .storyboard-input {
    position: static;
  }

  .storyboard-table {
    table-layout: auto;
  }

  .col-order,
  .col-example,
  .col-summary,
  .col-dialogue,
  .col-tips {
    width: auto;
  }

  .storyboard-thumb {
    width: 110px;
    height: 80px;
  }
}
</style>

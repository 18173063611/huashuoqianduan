<template>
  <div class="quick-render-page app-page-stack">
    <header class="quick-head">
      <div>
        <h1>一键成片</h1>
        <p>上传素材包，确认识别结果后直接生成视频。</p>
      </div>
      <div class="quick-mode-switch" aria-label="视频制作模式">
        <span>一键成片</span>
        <RouterLink to="/render">手动装配</RouterLink>
      </div>
    </header>

    <section class="app-card quick-panel">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>上传素材包</h2>
          <p class="app-muted">可一次选择多张图片、口播音频、BGM、字幕、分镜 JSON 或视频素材。</p>
        </div>
      </div>

      <label class="quick-upload" :class="{ disabled: uploading || busy }">
        <input
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.json,.txt,.srt"
          :disabled="uploading || busy"
          @change="handleFilesSelected"
        />
        <strong>{{ uploading ? '上传中...' : '选择素材文件' }}</strong>
        <small>素材会先保存到资产中心，再用于一键成片识别。</small>
      </label>

      <div v-if="materials.length" class="quick-materials">
        <article v-for="item in materials" :key="item.asset.assetId" class="quick-material">
          <div class="quick-material-main">
            <strong>{{ item.asset.fileName }}</strong>
            <small>{{ item.asset.assetType }} · {{ formatSize(item.asset.fileSize) }}</small>
          </div>
          <select v-model="item.role" :disabled="busy">
            <option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
          <button type="button" :disabled="busy" @click="removeMaterial(item.asset.assetId)">移除</button>
        </article>
      </div>
    </section>

    <section class="app-card quick-panel">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>成片设置</h2>
          <p class="app-muted">保持自动即可，只有目标非常明确时再手动指定。</p>
        </div>
      </div>

      <div class="quick-grid">
        <div class="quick-field">
          <label>成片目标</label>
          <select v-model="intent" :disabled="busy">
            <option value="auto">自动判断</option>
            <option value="car_sales">汽车销售</option>
            <option value="general_video">通用短视频</option>
          </select>
        </div>

        <div class="quick-field">
          <label>成片比例</label>
          <select v-model="aspectRatio" :disabled="busy">
            <option value="9:16">竖屏 9:16</option>
            <option value="16:9">横屏 16:9</option>
            <option value="auto">自动</option>
          </select>
        </div>

        <div class="quick-field">
          <label>字幕</label>
          <select v-model="subtitleMode" :disabled="busy">
            <option value="off">关闭</option>
            <option value="auto">自动</option>
            <option value="upload">上传</option>
          </select>
        </div>

        <div class="quick-field">
          <label>BGM</label>
          <select v-model="audioPolicy" :disabled="busy">
            <option value="auto">自动</option>
            <option value="none">无</option>
            <option value="bgm">从素材使用 BGM</option>
            <option value="voiceover">优先口播</option>
          </select>
        </div>

        <div class="quick-field">
          <label>成片时长</label>
          <select v-model.number="segmentCount" :disabled="busy">
            <option v-for="option in segmentOptions" :key="option.count" :value="option.count">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="subtitleMode === 'upload'" class="quick-field">
        <label>自定义字幕</label>
        <textarea
          v-model.trim="customSubtitle"
          :disabled="busy"
          maxlength="2000"
          rows="4"
          placeholder="请输入需要烧录到视频中的字幕内容"
        />
      </div>

      <div class="quick-field">
        <label>补充目标</label>
        <input v-model.trim="goalText" :disabled="busy" maxlength="120" placeholder="可选，例如：突出空间和低油耗" />
      </div>
    </section>

    <section class="app-card quick-panel">
      <div class="app-section-title">
        <span>3</span>
        <div>
          <h2>生成前摘要</h2>
          <p class="app-muted">确认素材角色和系统判断的链路后再提交。</p>
        </div>
      </div>

      <div class="quick-summary">
        <dl>
          <div>
            <dt>系统判断</dt>
            <dd>{{ routeLabel }}</dd>
          </div>
          <div>
            <dt>素材数量</dt>
            <dd>{{ materials.length }} 个</dd>
          </div>
          <div>
            <dt>字幕</dt>
            <dd>{{ subtitleLabel }}</dd>
          </div>
          <div>
            <dt>BGM</dt>
            <dd>{{ bgmLabel }}</dd>
          </div>
          <div>
            <dt>目标时长</dt>
            <dd>{{ totalDuration }} 秒</dd>
          </div>
        </dl>
        <p>{{ summaryText }}</p>
      </div>

      <div v-if="errorMessage" class="quick-error">{{ errorMessage }}</div>

      <div class="quick-actions">
        <button class="app-primary-button" type="button" :disabled="!canSubmit || busy" @click="submitQuickRender">
          {{ busy ? '生成中...' : '一键生成' }}
        </button>
        <span v-if="taskStatus" class="quick-status">
          {{ taskStatus }}<template v-if="taskProgress != null"> · {{ taskProgress }}%</template>
        </span>
      </div>
    </section>

    <section class="app-card quick-panel">
      <div class="app-section-title">
        <span>4</span>
        <div>
          <h2>生成结果</h2>
          <p class="app-muted">任务完成后会在这里展示视频结果。</p>
        </div>
      </div>

      <div v-if="!result && !busy" class="app-empty quick-empty">暂无结果</div>
      <div v-if="busy" class="quick-running">任务处理中，请保持页面打开。</div>
      <div v-if="result" class="quick-result">
        <video :src="result.videoUrl" controls preload="metadata" />
        <div class="quick-result-meta">
          <span>任务 ID：{{ result.localTaskId || result.taskId }}</span>
          <span>模型：{{ result.model }}</span>
        </div>
        <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">打开视频</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { getAssetTextContent, uploadMaterialAsset } from '../../services/assetApi'
import {
  getDigitalHumanVideoTask,
  newVideoIdempotencyKey,
  quickRenderVideo,
} from '../../services/videoApi'
import { trackTaskResult } from '../../services/taskRealtime'
import type { AssetItem } from '../../types/assetTypes'
import type {
  DigitalHumanTaskDetailResponse,
  QuickRenderAssetRole,
  QuickRenderIntent,
  QuickRenderRequest,
  QuickRenderResponse,
  VideoTaskVO,
} from '../../types/videoTypes'

interface QuickMaterial {
  asset: AssetItem
  role: QuickRenderAssetRole
  textContent?: string
}

const roleOptions: Array<{ value: QuickRenderAssetRole; label: string }> = [
  { value: 'car_exterior_front', label: '车头外观' },
  { value: 'car_exterior_side', label: '车侧外观' },
  { value: 'car_exterior_rear', label: '车尾外观' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'car_interior_front_seat', label: '前排座椅' },
  { value: 'car_interior_back_seat', label: '后排座椅' },
  { value: 'car_detail_light', label: '车灯细节' },
  { value: 'car_detail_wheel', label: '轮毂细节' },
  { value: 'car_detail_logo', label: '车标细节' },
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'scene_outdoor', label: '户外场景' },
  { value: 'scene_road', label: '道路场景' },
  { value: 'host_image', label: '数字人图片' },
  { value: 'voiceover', label: '口播音频' },
  { value: 'bgm', label: 'BGM' },
  { value: 'reference_audio', label: '参考音频' },
  { value: 'subtitle', label: '字幕文本' },
  { value: 'voice_script', label: '口播文案' },
  { value: 'storyboard_json', label: '分镜 JSON' },
  { value: 'benchmark_json', label: '对标 JSON' },
  { value: 'material_video', label: '视频素材' },
  { value: 'host_video', label: '口播视频' },
  { value: 'reference_video', label: '参考视频' },
  { value: 'material', label: '普通素材' },
]

const materials = ref<QuickMaterial[]>([])
const intent = ref<QuickRenderIntent>('auto')
const aspectRatio = ref<'9:16' | '16:9' | 'auto'>('9:16')
const subtitleMode = ref<'off' | 'auto' | 'upload'>('auto')
const customSubtitle = ref('')
const audioPolicy = ref<'auto' | 'none' | 'voiceover' | 'bgm'>('auto')
const goalText = ref('')
const segmentDuration = 8
const segmentCount = ref(4)
const uploading = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const result = ref<VideoTaskVO | null>(null)
let stopTracking: (() => void) | null = null
let digitalHumanPollTimer: number | null = null

const canSubmit = computed(() => materials.value.length > 0 && !uploading.value)
const segmentOptions = computed(() =>
  Array.from({ length: 6 }, (_, idx) => {
    const count = idx + 1
    return {
      count,
      label: `${count * segmentDuration} 秒（${count} 段）`,
    }
  }),
)
const totalDuration = computed(() => segmentCount.value * segmentDuration)

const inferredRoute = computed(() => {
  if (intent.value !== 'auto') return intent.value
  if (materials.value.some((item) => item.role.startsWith('car_exterior'))) return 'car_sales'
  if (
    materials.value.some((item) => item.role === 'host_image') &&
    materials.value.some((item) => item.role === 'voiceover' || item.role === 'voice_script')
  ) {
    return 'digital_human'
  }
  const videoCount = materials.value.filter((item) => item.asset.assetType === 'VIDEO').length
  const imageCount = materials.value.filter((item) => item.asset.assetType === 'IMAGE').length
  if (videoCount > 0 && videoCount >= imageCount) return 'material_mix'
  if (imageCount > 0) return 'general_video'
  return 'auto'
})

const routeLabel = computed(() => {
  const map: Record<string, string> = {
    auto: '等待素材',
    car_sales: '汽车销售成片',
    digital_human: '数字人口播',
    general_video: '通用图生视频',
    material_mix: '素材混剪',
  }
  return map[inferredRoute.value] || '自动判断'
})

const subtitleLabel = computed(() => {
  if (subtitleMode.value === 'off') return '关闭'
  if (subtitleMode.value === 'upload') return '使用上传字幕'
  return '自动'
})

const bgmLabel = computed(() => {
  const bgm = materials.value.find((item) => item.role === 'bgm')
  if (audioPolicy.value === 'none') return '无'
  return bgm ? `使用 ${bgm.asset.fileName}` : '未检测到 BGM'
})

const summaryText = computed(() => {
  if (!materials.value.length) return '上传素材后将自动生成摘要。'
  const parts = roleOptions
    .map((role) => {
      const count = materials.value.filter((item) => item.role === role.value).length
      return count > 0 ? `${role.label} ${count} 个` : ''
    })
    .filter(Boolean)
  return `已识别：${parts.join('、')}。`
})

async function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploading.value = true
  errorMessage.value = ''
  try {
    for (const file of files) {
      const asset = await uploadMaterialAsset(file)
      const material: QuickMaterial = {
        asset,
        role: inferRole(file, asset),
      }
      if (shouldReadText(asset, file)) {
        material.textContent = await readTextContent(asset).catch(() => '')
      }
      materials.value.push(material)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '素材上传失败'
  } finally {
    uploading.value = false
  }
}

function removeMaterial(assetId: number) {
  materials.value = materials.value.filter((item) => item.asset.assetId !== assetId)
}

async function submitQuickRender() {
  if (!canSubmit.value || busy.value) return
  errorMessage.value = ''
  result.value = null
  taskStatus.value = ''
  taskProgress.value = null
  busy.value = true
  stopAllTracking()

  const payload: QuickRenderRequest = {
    intent: intent.value,
    assetIds: materials.value.map((item) => item.asset.assetId),
    assetRoles: Object.fromEntries(materials.value.map((item) => [String(item.asset.assetId), item.role])),
    assetTextContents: Object.fromEntries(
      materials.value
        .filter((item) => item.textContent && item.textContent.trim())
        .map((item) => [String(item.asset.assetId), item.textContent || '']),
    ),
    aspectRatio: aspectRatio.value,
    subtitleMode: subtitleMode.value,
    burnInSubtitle: subtitleMode.value !== 'off',
    customSubtitle: subtitleMode.value === 'upload' ? customSubtitle.value || undefined : undefined,
    audioPolicy: audioPolicy.value,
    model: 'auto',
    segmentCount: segmentCount.value,
    segmentDuration,
    goalText: goalText.value || undefined,
  }

  try {
    const submitted = await quickRenderVideo(payload, newVideoIdempotencyKey())
    if (submitted.task?.taskId) {
      startQuickRenderTracking(submitted.task.taskId)
      return
    }
    if (submitted.digitalHumanTask?.taskId) {
      startDigitalHumanPoll(submitted.digitalHumanTask.taskId)
      return
    }
    busy.value = false
    errorMessage.value = submitted.summary || '任务提交成功，但未返回可跟踪任务'
  } catch (error) {
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '一键成片提交失败'
  }
}

function startQuickRenderTracking(taskId: number) {
  stopTracking = trackTaskResult<QuickRenderResponse>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      errorMessage.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      const quick = taskResult.result
      taskStatus.value = 'QUICK_RENDER_DONE'
      taskProgress.value = taskResult.progress ?? 100
      if (quick.task?.taskId) {
        startTaskTracking(quick.task.taskId)
        return
      }
      if (quick.digitalHumanTask?.taskId) {
        startDigitalHumanPoll(quick.digitalHumanTask.taskId)
        return
      }
      busy.value = false
      errorMessage.value = quick.summary || '一键成片已完成，但未返回下游生成任务'
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '一键成片编排任务失败'
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      busy.value = false
    },
    onError(error) {
      errorMessage.value = error.message
      busy.value = false
    },
  })
}

function startTaskTracking(taskId: number) {
  stopTracking?.()
  stopTracking = trackTaskResult<VideoTaskVO>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      errorMessage.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      taskStatus.value = String(taskResult.status)
      taskProgress.value = taskResult.progress ?? 100
      result.value = taskResult.result
      busy.value = false
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '一键成片任务失败'
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      busy.value = false
    },
    onError(error) {
      errorMessage.value = error.message
      busy.value = false
    },
  })
}

function startDigitalHumanPoll(taskId: number) {
  stopDigitalHumanPoll()
  void pollDigitalHumanOnce(taskId)
  digitalHumanPollTimer = window.setInterval(() => {
    void pollDigitalHumanOnce(taskId)
  }, 2000)
}

async function pollDigitalHumanOnce(taskId: number) {
  try {
    const detail = await getDigitalHumanVideoTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    errorMessage.value = detail.errorMessage || ''
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopDigitalHumanPoll()
      busy.value = false
      if (detail.status === 'SUCCESS' && detail.videoUrl) {
        result.value = digitalHumanDetailToVideoResult(detail)
      }
    }
  } catch (error) {
    stopDigitalHumanPoll()
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '数字人口播任务查询失败'
  }
}

function stopDigitalHumanPoll() {
  if (digitalHumanPollTimer != null) {
    window.clearInterval(digitalHumanPollTimer)
    digitalHumanPollTimer = null
  }
}

function stopAllTracking() {
  stopTracking?.()
  stopTracking = null
  stopDigitalHumanPoll()
}

function digitalHumanDetailToVideoResult(detail: DigitalHumanTaskDetailResponse): VideoTaskVO {
  const now = Math.floor(Date.now() / 1000)
  return {
    taskId: String(detail.taskId),
    model: detail.model || 'viduq2-turbo',
    status: 'succeeded',
    createdAt: now,
    updatedAt: now,
    videoUrl: detail.videoUrl || '',
    resultAssetId: detail.resultAssetId,
    lastFrameUrl: detail.coverUrl,
    completionTokens: detail.credits || 0,
    errorCode: null,
    errorMessage: null,
  }
}

function inferRole(file: File, asset: AssetItem): QuickRenderAssetRole {
  const name = `${file.name} ${asset.fileName || ''}`.toLowerCase()
  const mime = (file.type || asset.mimeType || '').toLowerCase()
  if (mime.startsWith('audio/')) {
    if (name.includes('bgm') || name.includes('music') || name.includes('背景')) return 'bgm'
    if (name.includes('ref') || name.includes('reference')) return 'reference_audio'
    return 'voiceover'
  }
  if (mime.startsWith('video/')) {
    if (name.includes('host') || name.includes('avatar') || name.includes('主播') || name.includes('口播')) {
      return 'host_video'
    }
    if (name.includes('ref') || name.includes('reference') || name.includes('对标')) return 'reference_video'
    return 'material_video'
  }
  if (mime.includes('json') || name.endsWith('.json')) {
    if (name.includes('benchmark') || name.includes('对标')) return 'benchmark_json'
    return 'storyboard_json'
  }
  if (mime.startsWith('text/') || name.endsWith('.srt') || name.endsWith('.txt')) {
    if (name.includes('subtitle') || name.includes('字幕') || name.endsWith('.srt')) return 'subtitle'
    return 'voice_script'
  }
  if (mime.startsWith('image/')) {
    if (name.includes('host') || name.includes('avatar') || name.includes('主播') || name.includes('数字人')) return 'host_image'
    if (name.includes('side') || name.includes('侧')) return 'car_exterior_side'
    if (name.includes('rear') || name.includes('back') || name.includes('尾')) return 'car_exterior_rear'
    if (name.includes('interior') || name.includes('内饰') || name.includes('dashboard')) return 'car_interior_dashboard'
    if (name.includes('wheel') || name.includes('轮')) return 'car_detail_wheel'
    if (name.includes('logo') || name.includes('标')) return 'car_detail_logo'
    if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
    if (name.includes('showroom') || name.includes('展厅')) return 'scene_showroom'
    if (name.includes('road') || name.includes('道路')) return 'scene_road'
    if (name.includes('car') || name.includes('front') || name.includes('车')) return 'car_exterior_front'
    return 'scene_outdoor'
  }
  return 'material'
}

function shouldReadText(asset: AssetItem, file: File) {
  const mime = (file.type || asset.mimeType || '').toLowerCase()
  const name = (file.name || asset.fileName || '').toLowerCase()
  return mime.startsWith('text/') || mime.includes('json') || name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.srt')
}

async function readTextContent(asset: AssetItem) {
  const text = await getAssetTextContent(asset)
  return text.length > 20000 ? text.slice(0, 20000) : text
}

function formatSize(size: number | null | undefined) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

onBeforeUnmount(stopAllTracking)
</script>

<style scoped>
.quick-render-page {
  display: grid;
  gap: 16px;
}

.quick-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quick-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 850;
}

.quick-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.quick-mode-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}

.quick-mode-switch a,
.quick-mode-switch span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border-radius: 6px;
  padding: 0 12px;
  color: #4f586c;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.quick-mode-switch span {
  background: #f5f3ff;
  color: #5e50df;
}

.quick-panel {
  display: grid;
  gap: 16px;
}

.quick-upload {
  display: grid;
  min-height: 112px;
  place-items: center;
  gap: 6px;
  border: 1px dashed #c8bfff;
  border-radius: 8px;
  background: #fbfaff;
  color: #5e50df;
  cursor: pointer;
  padding: 18px;
  text-align: center;
}

.quick-upload input {
  display: none;
}

.quick-upload strong {
  font-size: 15px;
  font-weight: 900;
}

.quick-upload small {
  color: #98a2b3;
  font-size: 12.5px;
  font-weight: 700;
}

.quick-upload.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.quick-materials {
  display: grid;
  gap: 10px;
}

.quick-material {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px 64px;
  gap: 12px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.quick-material-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.quick-material-main strong,
.quick-material-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-material-main strong {
  color: #232838;
  font-size: 13.5px;
  font-weight: 850;
}

.quick-material-main small {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.quick-material select,
.quick-field select,
.quick-field input,
.quick-field textarea {
  height: 38px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}

.quick-field textarea {
  min-height: 92px;
  padding: 10px;
  line-height: 1.6;
  resize: vertical;
}

.quick-material button {
  height: 34px;
  border: 1px solid #f4cccc;
  border-radius: 8px;
  background: #fff5f5;
  color: #d92d20;
  cursor: pointer;
  font-weight: 800;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.quick-field {
  display: grid;
  gap: 8px;
}

.quick-field label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 850;
}

.quick-summary {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.quick-summary dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.quick-summary dt {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 800;
}

.quick-summary dd {
  margin: 4px 0 0;
  color: #232838;
  font-size: 13px;
  font-weight: 850;
}

.quick-summary p {
  margin: 0;
  color: #4f586c;
  font-size: 13px;
  line-height: 1.7;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-status {
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.quick-error {
  border-radius: 8px;
  background: #fff1f0;
  color: #b42318;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.quick-empty,
.quick-running {
  margin: 0;
}

.quick-running {
  color: #5e50df;
  font-weight: 800;
}

.quick-result {
  display: grid;
  gap: 14px;
}

.quick-result video {
  width: 100%;
  max-height: 480px;
  border-radius: 8px;
  background: #1f2230;
}

.quick-result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #667085;
  font-size: 13px;
  font-weight: 750;
}

@media (max-width: 900px) {
  .quick-head,
  .quick-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-grid,
  .quick-summary dl {
    grid-template-columns: 1fr 1fr;
  }

  .quick-material {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .quick-grid,
  .quick-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>

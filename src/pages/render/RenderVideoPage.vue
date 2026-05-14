<template>
  <div class="render-video-page app-page-stack">
    <header class="render-head">
      <h1>视频合成</h1>
      <p>
        基于火山方舟 Seedance 系列模型，通过文字或图片生成短视频。后端同步轮询任务，
        生成耗时通常 1~3 分钟，期间请保持页面打开。
      </p>
    </header>

    <section class="app-card render-input">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>选择生成模式</h2>
          <p class="app-muted">
            文生视频仅需文本提示词；图生视频支持首帧、首尾帧、参照图三种子模式。
          </p>
        </div>
      </div>

      <div class="render-tabs render-tabs-main" role="tablist">
        <button
          v-for="tab in visibleMainTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: mainTab === tab.key }"
          :aria-selected="mainTab === tab.key"
          :disabled="busy"
          @click="mainTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="mainTab === 'image'" class="render-tabs render-tabs-sub" role="tablist">
        <button
          v-for="tab in imageSubTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: imageSubTab === tab.key }"
          :aria-selected="imageSubTab === tab.key"
          :disabled="busy"
          @click="imageSubTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="render-form">
        <template v-if="mainTab === 'digitalHuman'">
          <div class="digital-human-guide" aria-label="数字人口播流程">
            <div class="digital-human-guide-item" :class="{ done: digitalHumanImage }">
              <span>1</span>
              <strong>主播图</strong>
            </div>
            <div
              class="digital-human-guide-item"
              :class="{ done: digitalHumanAudioReady }"
            >
              <span>2</span>
              <strong>口播内容</strong>
            </div>
            <div class="digital-human-guide-item" :class="{ done: canSubmit }">
              <span>3</span>
              <strong>生成视频</strong>
            </div>
          </div>

          <div class="render-digital-workspace">
            <section class="render-digital-section">
              <h3>主播图</h3>
              <AssetPicker
                title="从资产中心选择主播图"
                asset-type="IMAGE"
                :selected-url="digitalHumanImage"
                placeholder="搜索图片资产..."
                @select="digitalHumanImage = $event.url"
              />
              <ImageInput
                label="粘贴 / 上传主播图片"
                :busy="busy"
                :value="digitalHumanImage"
                placeholder="https://xxx.tos-cn-guangzhou.volces.com/avatar.png"
                @update="digitalHumanImage = $event"
              />
            </section>

            <section class="render-digital-section">
              <h3>口播内容</h3>
              <div class="render-tabs render-tabs-sub" role="tablist">
                <button
                  v-for="tab in digitalHumanAudioTabs"
                  :key="tab.key"
                  type="button"
                  role="tab"
                  :class="{ active: digitalHumanAudioMode === tab.key }"
                  :aria-selected="digitalHumanAudioMode === tab.key"
                  :disabled="busy"
                  @click="digitalHumanAudioMode = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>

              <AssetPicker
                v-if="digitalHumanAudioMode === 'asset'"
                title="从资产中心选择口播音频"
                asset-type="AUDIO"
                :selected-url="digitalHumanAudio"
                placeholder="搜索音频资产..."
                @select="digitalHumanAudio = $event.url"
              />

              <div v-else-if="digitalHumanAudioMode === 'upload'" class="render-form-field">
                <label>上传本地口播音频</label>
                <label class="render-upload-audio" :class="{ disabled: busy || digitalHumanAudioUploading }">
                  <input
                    type="file"
                    accept="audio/*"
                    :disabled="busy || digitalHumanAudioUploading"
                    @change="handleDigitalHumanAudioUpload"
                  />
                  <span>{{ digitalHumanAudioUploading ? '上传中...' : '选择音频文件' }}</span>
                  <small>{{ digitalHumanAudioUploadName || '支持 mp3 / wav / m4a 等音频' }}</small>
                </label>
                <p v-if="digitalHumanAudio" class="app-muted render-ref-tip">{{ digitalHumanAudio }}</p>
              </div>

              <div v-else-if="digitalHumanAudioMode === 'url'" class="render-form-field">
                <label>口播音频 URL</label>
                <input v-model.trim="digitalHumanAudio" type="url" :disabled="busy" placeholder="https://xxx/tts.mp3" />
              </div>

              <div v-else class="render-form-field">
                <label>口播文本</label>
                <textarea
                  v-model="digitalHumanText"
                  :disabled="busy"
                  rows="4"
                  maxlength="2000"
                  placeholder="输入文本后由 Vidu 使用指定音色生成口播。"
                />
              </div>
            </section>
          </div>

          <div class="render-grid-two render-digital-options">
            <div v-if="digitalHumanAudioMode === 'text'" class="render-form-field">
              <label>Vidu 音色 ID</label>
              <input v-model.trim="digitalHumanVoiceId" :disabled="busy" placeholder="例如 Vidu 提供的 voice_id" />
            </div>
            <div class="render-form-field">
              <label>分辨率</label>
              <select v-model="digitalHumanResolution" :disabled="busy">
                <option value="540p">540p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>
          </div>
        </template>

        <template v-if="mainTab === 'image' && imageSubTab === 'first'">
          <ImageInput
            label="首帧图片"
            :busy="busy"
            :value="firstFrame"
            @update="firstFrame = $event"
          />
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'firstLast'">
          <div class="render-grid-two">
            <ImageInput
              label="首帧图片"
              :busy="busy"
              :value="firstFrame"
              @update="firstFrame = $event"
            />
            <ImageInput
              label="尾帧图片"
              :busy="busy"
              :value="lastFrame"
              @update="lastFrame = $event"
            />
          </div>
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'reference'">
          <div class="render-form-field">
            <div class="render-field-head">
              <label>参照图（1 ~ 9 张，推荐 1 ~ 4 张）</label>
              <button
                type="button"
                class="app-secondary-button render-mini-btn"
                :disabled="busy || referenceImages.length >= MAX_REFERENCE"
                @click="addReferenceSlot"
              >
                + 添加一张
              </button>
            </div>
            <div class="render-ref-list">
              <div
                v-for="(item, idx) in referenceImages"
                :key="`ref-${idx}`"
                class="render-ref-item"
              >
                <div class="render-ref-index">[图{{ idx + 1 }}]</div>
                <ImageInput
                  :busy="busy"
                  :value="item"
                  compact
                  @update="updateReferenceImage(idx, $event)"
                />
                <button
                  type="button"
                  class="render-ref-remove"
                  :disabled="busy || referenceImages.length <= 1"
                  title="移除该参照图"
                  @click="removeReferenceSlot(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <p class="app-muted render-ref-tip">
              提示词中可使用 [图1]、[图2] 等标记指代具体参照图，模型对指令的遵循会更精准。
            </p>
          </div>
        </template>

        <div v-if="mainTab !== 'digitalHuman'" class="render-form-field">
          <label>
            提示词
            <span v-if="mainTab === 'text'" class="render-required">*</span>
            <span v-else class="render-optional">（选填）</span>
          </label>
          <textarea
            v-model="prompt"
            :placeholder="promptPlaceholder"
            rows="4"
            :disabled="busy"
            maxlength="500"
          />
          <div class="render-counter">{{ prompt.length }} / 500</div>
        </div>

        <div v-if="mainTab !== 'digitalHuman'" class="render-form-field render-form-field-inline">
          <label>视频时长（秒）</label>
          <select v-model.number="duration" :disabled="busy">
            <option v-for="d in durationOptions" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
          <span class="app-muted render-duration-hint">{{ durationHint }}</span>
        </div>

        <div
          v-if="showModelSelector"
          class="render-form-field render-form-field-inline"
        >
          <label>生成模型</label>
          <div
            class="render-model-dropdown"
            :class="{ open: modelDropdownOpen, disabled: busy }"
            @mouseleave="closeModelDropdown"
          >
            <button
              type="button"
              class="render-model-trigger"
              :disabled="busy"
              :aria-expanded="modelDropdownOpen"
              @click="modelDropdownOpen = !modelDropdownOpen"
            >
              <span>{{ selectedModelLabel }}</span>
              <span class="render-model-caret" aria-hidden="true">▾</span>
            </button>
            <ul v-if="modelDropdownOpen" class="render-model-options" role="listbox">
              <li
                v-for="opt in seedanceModelOptions"
                :key="opt.value"
                class="render-model-option"
                :class="{ active: selectedModel === opt.value, 'has-tip': !!opt.tip }"
                role="option"
                :aria-selected="selectedModel === opt.value"
                :data-tip="opt.tip || null"
                @click="selectModel(opt.value)"
              >
                <span>{{ opt.label }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <BillingEstimateBanner
        :estimated-credit-cost="renderEstimate.estimatedCreditCost.value"
        :balance="renderEstimate.balance.value"
        :loading="renderEstimate.loading.value"
        :steps="renderEstimate.steps.value"
      />

      <div class="render-actions">
        <button
          class="app-primary-button"
          type="button"
          :disabled="!canSubmit || busy || !!renderEstimate.insufficientHint.value"
          :title="renderEstimate.insufficientHint.value ?? ''"
          @click="handleGenerate"
        >
          {{ busy ? '生成中…' : '开始生成视频' }}
        </button>
        <button
          v-if="result || errorMessage"
          class="app-secondary-button"
          type="button"
          :disabled="busy"
          @click="resetResult"
        >
          重新开始
        </button>
      </div>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
    </section>

    <section class="app-card render-result">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>生成结果</h2>
          <p class="app-muted">
            视频由火山方舟同步生成，请耐心等待 1~3 分钟。生成后可直接预览或下载。
          </p>
        </div>
      </div>

      <div v-if="busy" class="render-status">
        <span class="render-status-dot" />
        正在生成视频，预计 1~3 分钟，期间请勿关闭页面…
      </div>

      <div v-if="showTaskProgress" class="render-digital-progress">
        <div
          class="render-progress-track"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="barProgressPercent"
        >
          <div class="render-progress-fill" :style="{ width: `${barProgressPercent}%` }" />
        </div>
        <span>{{ barProgressPercent }}%</span>
      </div>
      <p v-if="digitalHumanTaskError" class="app-error">{{ digitalHumanTaskError }}</p>

      <div v-if="!busy && !result" class="app-empty render-empty">
        生成完成后，视频会自动展示在这里。
      </div>

      <div v-if="result" class="render-video">
        <video :src="result.videoUrl" controls preload="metadata" />
        <div class="render-video-meta">
          <div class="render-meta-row">
            <span class="render-meta-key">任务 ID</span>
            <span class="render-meta-value">{{ result.taskId }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">使用模型</span>
            <span class="render-meta-value">{{ result.model }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">消耗 tokens</span>
            <span class="render-meta-value">{{ result.completionTokens }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">完成时间</span>
            <span class="render-meta-value">{{ formatTimestamp(result.updatedAt) }}</span>
          </div>
        </div>
        <div class="render-video-actions">
          <a class="app-primary-button" :href="result.videoUrl" target="_blank" rel="noreferrer" download>
            下载视频
          </a>
          <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">
            在新窗口打开
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AssetPicker from './AssetPicker.vue'
import ImageInput from './ImageInput.vue'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { trackTaskResult } from '../../services/taskRealtime'
import { newIdempotencyKey } from '../../services/taskApi'
import { uploadFile } from '../../services/uploadApi'
import {
  generateDigitalHumanVideo,
  generateFirstFrameVideo,
  generateFirstLastFrameVideo,
  generateReferenceVideo,
  generateTextToVideo,
  getDigitalHumanVideoTask,
} from '../../services/videoApi'
import type { DigitalHumanTaskDetailResponse, VideoTaskVO } from '../../types/videoTypes'


type MainTab = 'text' | 'image' | 'digitalHuman'
type ImageSubTab = 'first' | 'firstLast' | 'reference'
type DigitalHumanAudioMode = 'asset' | 'upload' | 'url' | 'text'
type SeedanceModelValue = 'doubao-seedance-1-5-pro-251215' | 'ep-20260512233524-85r4g'

const MAX_REFERENCE = 9

const seedanceModelOptions: Array<{
  value: SeedanceModelValue
  label: string
  tip?: string
}> = [
  { value: 'doubao-seedance-1-5-pro-251215', label: 'seedance1.5' },
  { value: 'ep-20260512233524-85r4g', label: 'seedance2.0', tip: '不支持上传人脸' },
]

const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'text', label: '文生视频' },
  { key: 'image', label: '图生视频' },
  { key: 'digitalHuman', label: '数字人口播' },
]

/** 临时开关：设为 true 可恢复「数字人口播」主 Tab 入口（不删逻辑与数据结构） */
const ENABLE_DIGITAL_HUMAN_TAB = false

const visibleMainTabs = computed(() =>
  ENABLE_DIGITAL_HUMAN_TAB ? mainTabs : mainTabs.filter((t) => t.key !== 'digitalHuman'),
)

const imageSubTabs: Array<{ key: ImageSubTab; label: string }> = [
  { key: 'first', label: '首帧生成' },
  { key: 'firstLast', label: '首尾帧生成' },
  { key: 'reference', label: '参照图生成' },
]

const digitalHumanAudioTabs: Array<{ key: DigitalHumanAudioMode; label: string }> = [
  { key: 'asset', label: '资产音频' },
  { key: 'upload', label: '上传音频' },
  { key: 'url', label: '音频链接' },
  { key: 'text', label: '文本口播' },
]

const mainTab = ref<MainTab>('text')
const imageSubTab = ref<ImageSubTab>('first')

watch(
  () => mainTab.value,
  (tab) => {
    if (!ENABLE_DIGITAL_HUMAN_TAB && tab === 'digitalHuman') {
      mainTab.value = 'text'
    }
  },
  { immediate: true },
)

const selectedModel = ref<SeedanceModelValue>('doubao-seedance-1-5-pro-251215')
const modelDropdownOpen = ref(false)

const prompt = ref('')
const duration = ref<number>(5)
const firstFrame = ref('')
const lastFrame = ref('')
const referenceImages = ref<string[]>([''])
const digitalHumanImage = ref('')
const digitalHumanAudio = ref('')
const digitalHumanText = ref('')
const digitalHumanVoiceId = ref('')
const digitalHumanResolution = ref<'540p' | '720p' | '1080p'>('720p')
const digitalHumanAudioMode = ref<DigitalHumanAudioMode>('asset')
const digitalHumanAudioUploading = ref(false)
const digitalHumanAudioUploadName = ref('')

const loggedIn = ref(false)

/**
 * 当前 Tab 对应的预扣 task_type：
 *   文生视频 → TEXT_TO_VIDEO_SEEDANCE_1_5（默认主力模型；2.0 价格不同，但前端展示以 1.5 为基线，
 *              提交时后端 createTask 会按真实 request 的 modelCode 重新解析，依旧能保证"前后一致"）
 *   图生视频（首帧 / 首尾帧） → IMAGE_TO_VIDEO_SEEDANCE_1_5
 *   图生视频（参照图）         → IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST
 *   数字人口播                 → DIGITAL_HUMAN_GENERATE
 */
const currentRenderTaskType = computed(() => {
  if (mainTab.value === 'digitalHuman') return 'DIGITAL_HUMAN_GENERATE'
  if (mainTab.value === 'text') return 'TEXT_TO_VIDEO_SEEDANCE_1_5'
  if (imageSubTab.value === 'reference') return 'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST'
  return 'IMAGE_TO_VIDEO_SEEDANCE_1_5'
})

// 一份预估 + Tab 切换自动重取；与后端 createTask 实际预扣金额保持一致，不允许任何前端写死。
const renderEstimate = useBillingEstimate({ taskType: () => currentRenderTaskType.value })

async function refreshLocalBalance() {
  await renderEstimate.refresh()
}

const busy = ref(false)
const errorMessage = ref('')
const result = ref<VideoTaskVO | null>(null)
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const activeDigitalHumanTaskId = ref<number | null>(null)
const activeSeedanceTaskId = ref<number | null>(null)
const digitalHumanTaskError = ref('')
/** 单次数字人口播提交周期内复用 Idempotency-Key */
const digitalHumanIdempotencyKey = ref<string | null>(null)
const { showTaskProgressBar, barProgressPercent, reset: resetSmoothProgress } = useSmoothTaskProgress(
  taskStatus,
  taskProgress,
)
const showTaskProgress = computed(
  () => showTaskProgressBar.value || !!activeDigitalHumanTaskId.value || !!activeSeedanceTaskId.value,
)
let digitalHumanPollTimer: number | null = null
let stopSeedanceTaskTracking: (() => void) | null = null

// Seedance 1.5 pro 支持 [4, 12]，参照图（lite i2v）支持 [2, 12]
const durationOptions = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ value: v, label: `${v} 秒` }))
  }
  return [4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ value: v, label: `${v} 秒` }))
})

const durationHint = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return 'lite i2v 模型支持 2 ~ 12 秒'
  }
  return 'Seedance 1.5 pro 支持 4 ~ 12 秒'
})

const showModelSelector = computed(() => {
  if (mainTab.value === 'text') {
    return true
  }
  if (mainTab.value === 'image') {
    return imageSubTab.value === 'first' || imageSubTab.value === 'firstLast'
  }
  return false
})

const selectedModelLabel = computed(
  () => seedanceModelOptions.find((o) => o.value === selectedModel.value)?.label ?? '',
)

function selectModel(value: SeedanceModelValue) {
  selectedModel.value = value
  modelDropdownOpen.value = false
}

function closeModelDropdown() {
  modelDropdownOpen.value = false
}

const promptPlaceholder = computed(() => {
  if (mainTab.value === 'text') {
    return '描述你想要的画面，例如：小猫对着镜头打哈欠，慵懒的午后阳光，景深浅'
  }
  if (imageSubTab.value === 'reference') {
    return '可使用 [图1]xxx，[图2]xxx 形式指代参照图，例如：[图1]戴眼镜穿蓝色T恤的男生在[图2]的篮球场上'
  }
  return '可选，描述视频中的运动 / 风格 / 镜头，例如：360 度环绕运镜，电影感'
})

const digitalHumanAudioReady = computed(() => {
  if (digitalHumanAudioMode.value === 'text') {
    return digitalHumanText.value.trim().length > 0
  }
  return digitalHumanAudio.value.trim().length > 0
})

// 切换模式时重置错误与结果，避免误展示其它模式产物
watch([mainTab, imageSubTab], () => {
  errorMessage.value = ''
  // 调整时长到当前模式允许的最小值（5 秒兼容两种模式）
  const allowed = durationOptions.value.map((o) => o.value)
  if (!allowed.includes(duration.value)) {
    duration.value = allowed[0]
  }
})

const canSubmit = computed(() => {
  if (mainTab.value === 'digitalHuman') {
    if (digitalHumanAudioMode.value === 'text') {
      return digitalHumanImage.value.trim().length > 0 && digitalHumanText.value.trim().length > 0
    }
    return digitalHumanImage.value.trim().length > 0 && digitalHumanAudio.value.trim().length > 0
  }
  if (mainTab.value === 'text') {
    return prompt.value.trim().length > 0
  }
  if (imageSubTab.value === 'first') {
    return firstFrame.value.trim().length > 0
  }
  if (imageSubTab.value === 'firstLast') {
    return firstFrame.value.trim().length > 0 && lastFrame.value.trim().length > 0
  }
  // reference
  return referenceImages.value.some((url) => url.trim().length > 0)
})

function addReferenceSlot() {
  if (referenceImages.value.length >= MAX_REFERENCE) {
    return
  }
  referenceImages.value.push('')
}

function removeReferenceSlot(idx: number) {
  if (referenceImages.value.length <= 1) {
    return
  }
  referenceImages.value.splice(idx, 1)
}

function updateReferenceImage(idx: number, value: string) {
  referenceImages.value[idx] = value
}

function resetResult() {
  stopDigitalHumanPoll()
  stopSeedanceTracking()
  activeDigitalHumanTaskId.value = null
  activeSeedanceTaskId.value = null
  taskStatus.value = ''
  taskProgress.value = null
  digitalHumanTaskError.value = ''
  digitalHumanIdempotencyKey.value = null
  resetSmoothProgress()
  result.value = null
  errorMessage.value = ''
}

function formatTimestamp(seconds: number | null | undefined) {
  if (!seconds) {
    return '-'
  }
  const d = new Date(seconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function normalizePublicUrl(url: string) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

async function handleDigitalHumanAudioUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  digitalHumanAudioUploadName.value = file.name
  digitalHumanAudioUploading.value = true
  errorMessage.value = ''

  try {
    const uploaded = await uploadFile(file)
    digitalHumanAudio.value = normalizePublicUrl(uploaded.previewUrl)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '音频上传失败'
  } finally {
    digitalHumanAudioUploading.value = false
    input.value = ''
  }
}

async function handleGenerate() {
  if (!canSubmit.value || busy.value) {
    return
  }

  busy.value = true
  errorMessage.value = ''
  result.value = null
  digitalHumanTaskError.value = ''

  try {
    let submittedTaskId = 0
    let submittedStatus = 'QUEUED'
    if (mainTab.value === 'digitalHuman') {
      if (!digitalHumanIdempotencyKey.value) {
        digitalHumanIdempotencyKey.value = newIdempotencyKey()
      }
      const useText = digitalHumanAudioMode.value === 'text'
      const submitted = await generateDigitalHumanVideo(
        {
          imageUrl: digitalHumanImage.value.trim(),
          audioUrl: useText ? undefined : digitalHumanAudio.value.trim(),
          text: useText ? digitalHumanText.value.trim() : undefined,
          voiceId: useText ? digitalHumanVoiceId.value.trim() || undefined : undefined,
          resolution: digitalHumanResolution.value,
        },
        digitalHumanIdempotencyKey.value,
      )
      digitalHumanIdempotencyKey.value = null
      rememberSessionTaskId(submitted.taskId)
      activeDigitalHumanTaskId.value = submitted.taskId
      taskStatus.value = submitted.status
      taskProgress.value = 0
      resetSmoothProgress()
      startDigitalHumanPoll(submitted.taskId)
      await refreshLocalBalance()
      const cost = renderEstimate.estimatedCreditCost.value
      if (cost > 0) {
        ElMessage.success(`任务已提交，已预扣 ${cost} 积分`)
      } else {
        ElMessage.success('任务已提交')
      }
      return
    } else if (mainTab.value === 'text') {
      const submitted = await generateTextToVideo({
        prompt: prompt.value.trim(),
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'first') {
      const submitted = await generateFirstFrameVideo({
        imageUrl: firstFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else if (imageSubTab.value === 'firstLast') {
      const submitted = await generateFirstLastFrameVideo({
        firstFrameUrl: firstFrame.value.trim(),
        lastFrameUrl: lastFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
        model: selectedModel.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    } else {
      const urls = referenceImages.value.map((u) => u.trim()).filter((u) => u.length > 0)
      const submitted = await generateReferenceVideo({
        imageUrls: urls,
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
      })
      submittedTaskId = submitted.taskId
      submittedStatus = String(submitted.status)
    }
    rememberSessionTaskId(submittedTaskId)
    activeSeedanceTaskId.value = submittedTaskId
    taskStatus.value = submittedStatus
    taskProgress.value = 0
    resetSmoothProgress()
    startSeedanceTaskTracking(submittedTaskId)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '视频生成失败'
    errorMessage.value = msg
    if (mainTab.value === 'digitalHuman') {
      digitalHumanIdempotencyKey.value = null
      if (msg.includes('积分余额不足') || msg.includes('40900')) {
        ElMessage.error('积分余额不足，无法提交当前任务')
      }
    }
    busy.value = false
  } finally {
    if (mainTab.value !== 'digitalHuman' && activeSeedanceTaskId.value == null) {
      busy.value = false
    }
  }
}

function startSeedanceTaskTracking(taskId: number) {
  stopSeedanceTracking()
  stopSeedanceTaskTracking = trackTaskResult<VideoTaskVO>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      digitalHumanTaskError.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      taskStatus.value = String(taskResult.status)
      taskProgress.value = taskResult.progress ?? 100
      result.value = taskResult.result
      busy.value = false
      activeSeedanceTaskId.value = null
      digitalHumanTaskError.value = taskResult.errorMessage || ''
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '视频生成任务失败'
      digitalHumanTaskError.value = errorMessage.value
      busy.value = false
      activeSeedanceTaskId.value = null
    },
    onError(error) {
      errorMessage.value = error.message
      digitalHumanTaskError.value = error.message
      busy.value = false
      activeSeedanceTaskId.value = null
    },
  })
}

function stopSeedanceTracking() {
  if (stopSeedanceTaskTracking) {
    stopSeedanceTaskTracking()
    stopSeedanceTaskTracking = null
  }
}

function startDigitalHumanPoll(taskId: number) {
  stopDigitalHumanPoll()
  void pollDigitalHumanOnce(taskId)
  digitalHumanPollTimer = window.setInterval(() => {
    void pollDigitalHumanOnce(taskId)
  }, 2000)
}

function stopDigitalHumanPoll() {
  if (digitalHumanPollTimer != null) {
    window.clearInterval(digitalHumanPollTimer)
    digitalHumanPollTimer = null
  }
}

async function pollDigitalHumanOnce(taskId: number) {
  try {
    const detail = await getDigitalHumanVideoTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    digitalHumanTaskError.value = detail.errorMessage || ''
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopDigitalHumanPoll()
      busy.value = false
      if (detail.status === 'SUCCESS' && detail.videoUrl) {
        result.value = digitalHumanDetailToVideoResult(detail)
      } else if (detail.errorMessage) {
        errorMessage.value = detail.errorMessage
      }
    }
  } catch (error) {
    stopDigitalHumanPoll()
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '数字人口播任务查询失败'
  }
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

onMounted(async () => {
  loggedIn.value = !!getAuthToken()
  await renderEstimate.refresh()
})

onBeforeUnmount(() => {
  stopDigitalHumanPoll()
  stopSeedanceTracking()
})
</script>

<style scoped>
.render-video-page {
  display: grid;
  gap: 16px;
}

.render-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 800;
}

.render-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.render-project-hint {
  margin-top: 8px !important;
}

.render-input,
.render-result {
  display: grid;
  gap: 16px;
}

.render-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.render-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.render-tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.render-tabs button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.render-tabs-sub button {
  height: 32px;
  padding: 0 12px;
  background: #f7f8fc;
  font-weight: 750;
}

.render-tabs-sub button.active {
  background: #fff;
  border-color: #c8bfff;
}

.render-form {
  display: grid;
  gap: 16px;
}

.digital-human-guide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 10px;
}

.digital-human-guide-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  color: #667085;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 800;
}

.digital-human-guide-item span {
  display: inline-grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #eef0f6;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 900;
}

.digital-human-guide-item.done {
  background: #f5f3ff;
  color: #5e50df;
}

.digital-human-guide-item.done span {
  background: #635bff;
  color: #fff;
}

.render-digital-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.render-digital-section {
  display: grid;
  gap: 12px;
  align-content: start;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.render-digital-section h3 {
  margin: 0;
  color: #2d3446;
  font-size: 14px;
  font-weight: 850;
}

.render-digital-options {
  align-items: end;
}

.render-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .digital-human-guide,
  .render-digital-workspace {
    grid-template-columns: 1fr;
  }

  .render-grid-two {
    grid-template-columns: 1fr;
  }
}

.render-form-field {
  display: grid;
  gap: 8px;
}

.render-form-field label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 800;
}

.render-required {
  margin-left: 4px;
  color: #e5484d;
}

.render-optional {
  margin-left: 4px;
  color: #98a2b3;
  font-weight: 700;
}

.render-form-field input,
.render-form-field select,
.render-form-field textarea {
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
}

.render-form-field input,
.render-form-field select {
  height: 38px;
}

.render-form-field textarea {
  line-height: 1.7;
  resize: vertical;
}

.render-form-field input:focus,
.render-form-field select:focus,
.render-form-field textarea:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-upload-audio {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px dashed #d9d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 12px 14px;
  cursor: pointer;
}

.render-upload-audio input {
  display: none;
}

.render-upload-audio span {
  flex: 0 0 auto;
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.render-upload-audio small {
  min-width: 0;
  overflow: hidden;
  color: #98a2b3;
  font-size: 12.5px;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.render-upload-audio.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.render-counter {
  align-self: flex-end;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.render-form-field-inline {
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 12px;
}

.render-form-field-inline select {
  height: 36px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  background: #fff;
  color: #232838;
  outline: none;
}

.render-form-field-inline select:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-duration-hint {
  font-size: 12.5px;
}

.render-model-dropdown {
  position: relative;
  display: inline-block;
  min-width: 160px;
}

.render-model-trigger {
  display: inline-flex;
  width: 100%;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  outline: none;
}

.render-model-trigger:hover:not(:disabled) {
  border-color: #c8bfff;
}

.render-model-trigger:focus,
.render-model-dropdown.open .render-model-trigger {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-model-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.render-model-caret {
  color: #98a2b3;
  font-size: 12px;
  transition: transform 0.18s ease;
}

.render-model-dropdown.open .render-model-caret {
  transform: rotate(180deg);
}

.render-model-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  min-width: 100%;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.render-model-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  color: #232838;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.render-model-option:hover {
  background: #f5f3ff;
  color: #5e50df;
}

.render-model-option.active {
  background: #faf9ff;
  color: #5e50df;
}

.render-model-option.has-tip:hover::after {
  content: attr(data-tip);
  position: absolute;
  top: 50%;
  left: calc(100% + 8px);
  transform: translateY(-50%);
  padding: 6px 10px;
  border-radius: 6px;
  background: #1f2230;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  pointer-events: none;
  z-index: 30;
}

.render-model-option.has-tip:hover::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-right-color: #1f2230;
  pointer-events: none;
  z-index: 30;
}

.render-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-mini-btn {
  height: 30px;
  padding: 0 12px;
  font-size: 12.5px;
}

.render-ref-list {
  display: grid;
  gap: 12px;
}

.render-ref-item {
  display: grid;
  grid-template-columns: 60px 1fr 36px;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px dashed #e3dcff;
  border-radius: 10px;
  background: #fbfaff;
}

.render-ref-index {
  padding-top: 8px;
  color: #5e50df;
  font-weight: 800;
  font-size: 13px;
}

.render-ref-remove {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  border: 1px solid #f4cccc;
  background: #fff5f5;
  color: #e5484d;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.render-ref-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.render-ref-tip {
  margin: 4px 0 0;
  font-size: 12.5px;
}

.render-digital-credit {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #e5e7eb;
}

.render-digital-credit p {
  margin: 0 0 6px;
  font-size: 14px;
}

.render-digital-credit p:last-child {
  margin-bottom: 0;
}

.render-credit-line {
  color: #374151;
}

.render-credit-line strong {
  color: #111827;
}

.render-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.render-status {
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

.render-digital-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: #fbfaff;
  padding: 10px 12px;
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.render-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.render-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #635bff 0%, #8b7cf6 100%);
  transition: width 0.35s ease;
}

.render-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #8b7cf6;
  animation: render-pulse 1.2s ease-in-out infinite;
}

@keyframes render-pulse {
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

.render-empty {
  margin: 0;
}

.render-video {
  display: grid;
  gap: 16px;
}

.render-video video {
  width: 100%;
  max-height: 480px;
  border-radius: 12px;
  background: #1f2230;
  outline: none;
}

.render-video-meta {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fafbff;
}

.render-meta-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.render-meta-key {
  flex: 0 0 88px;
  color: #98a2b3;
  font-weight: 700;
}

.render-meta-value {
  color: #2d3446;
  font-weight: 700;
  word-break: break-all;
}

.render-video-actions {
  display: flex;
  gap: 12px;
}

.render-video-actions a {
  text-decoration: none;
}
</style>

<template>
  <section class="pet-storyboard-page">
    <header class="pet-page-head">
      <div>
        <span>宠物创作中心</span>
        <h2>{{ templateTitle }}生产页</h2>
        <p>{{ pageDescription }}</p>
      </div>
      <div class="pet-head-meta">
        <strong>{{ draft.durationSeconds }} 秒</strong>
        <small>{{ draft.aspectRatio }} · {{ styleLabel }}</small>
      </div>
    </header>

    <nav class="pet-production-steps" aria-label="宠物视频生产流程">
      <span class="active"><b>01</b>创意脚本</span>
      <span class="active"><b>02</b>分镜节奏</span>
      <span><b>03</b>后期约束</span>
      <span><b>04</b>确认生成</span>
    </nav>

    <PetMaterialPicker
      :key="draft.templateId || 'storyboard-materials'"
      v-model="draft.materials"
      :initial-role="storyboardInitialMaterialRole"
      @change="handleMaterialsChange"
    />

    <section class="pet-command-board" :class="{ 'is-benchmark-mode': isBenchmarkTemplate }">
      <section v-if="isBenchmarkTemplate" class="pet-benchmark-link-panel">
        <div class="pet-benchmark-head">
          <div>
            <strong>对标视频链接解析</strong>
            <span>粘贴爆款视频链接后自动拆分镜，并改写为萌宠镜头。</span>
          </div>
          <em v-if="parsedBenchmarkShotCount > 0">已套用 {{ parsedBenchmarkShotCount }} 个镜头</em>
        </div>
        <div class="pet-benchmark-source-tabs" role="tablist" aria-label="爆款对标来源">
          <button
            type="button"
            role="tab"
            :class="{ active: benchmarkSourceMode === 'url' }"
            :aria-selected="benchmarkSourceMode === 'url'"
            :disabled="benchmarkParsing || benchmarkUploading || busy || creating"
            @click="benchmarkSourceMode = 'url'"
          >
            视频链接
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: benchmarkSourceMode === 'upload' }"
            :aria-selected="benchmarkSourceMode === 'upload'"
            :disabled="benchmarkParsing || benchmarkUploading || busy || creating"
            @click="benchmarkSourceMode = 'upload'"
          >
            本地上传
          </button>
        </div>
        <VideoPlatformTabs
          v-if="benchmarkSourceMode === 'url'"
          v-model="selectedBenchmarkPlatform"
          class="pet-benchmark-platform-tabs"
          :options="petBenchmarkPlatformOptions"
          :disabled="benchmarkParsing || busy || creating"
        />
        <div v-if="benchmarkSourceMode === 'url'" class="pet-benchmark-link-row">
          <input
            v-model.trim="benchmarkUrl"
            type="url"
            :placeholder="benchmarkVideoPlaceholder"
            :disabled="benchmarkParsing || busy || creating"
          />
          <button
            v-if="false"
            type="button"
            class="primary"
            :disabled="!canParseBenchmarkUrl || benchmarkParsing || busy || creating"
            :title="selectedBenchmarkLimitReason"
            @click="handleParseBenchmarkUrl"
          >
            {{ benchmarkParsing ? (benchmarkStage || '解析中...') : '解析并套用' }}
          </button>
          <button
            v-if="false && (benchmarkParsing || benchmarkCanceling)"
            type="button"
            :disabled="benchmarkCanceling"
            @click="cancelBenchmarkParse"
          >
            {{ benchmarkCanceling ? '取消中...' : '取消解析' }}
          </button>
        </div>
        <div v-if="benchmarkSourceMode === 'upload'" class="pet-benchmark-upload-panel">
          <label class="pet-benchmark-file-picker" :class="{ disabled: benchmarkUploading || benchmarkParsing || busy || creating }">
            <input
              ref="benchmarkFileInputRef"
              type="file"
              accept="video/*"
              :disabled="benchmarkUploading || benchmarkParsing || busy || creating"
              @change="handleBenchmarkFileChange"
            />
            <span>{{ benchmarkUploading ? '上传中...' : '选择本地视频' }}</span>
            <strong :title="benchmarkUploadFileName">{{ benchmarkUploadFileName || '支持 MP4、MOV、WEBM 等视频文件' }}</strong>
          </label>
          <div v-if="benchmarkUploadProgressPercent !== null || benchmarkUploadProgressText" class="pet-benchmark-upload-progress">
            <div>
              <span :style="{ width: `${benchmarkUploadProgressPercent ?? 12}%` }" />
            </div>
            <small>{{ benchmarkUploadProgressText || '上传完成' }}</small>
          </div>
          <button
            v-if="benchmarkUploading"
            type="button"
            class="pet-benchmark-cancel-upload"
            @click="cancelBenchmarkUpload"
          >
            取消上传
          </button>
        </div>
        <div v-if="benchmarkParsing || benchmarkCanceling" class="pet-benchmark-cancel-row">
          <button type="button" :disabled="benchmarkCanceling" @click="cancelBenchmarkParse">
            {{ benchmarkCanceling ? '取消中...' : '取消对标生产' }}
          </button>
        </div>
        <p v-if="selectedBenchmarkLimitReason" class="pet-benchmark-notice warn">{{ selectedBenchmarkLimitReason }}</p>
        <p v-else-if="benchmarkAutoHint" class="pet-benchmark-notice">{{ benchmarkAutoHint }}</p>
        <p v-if="benchmarkError" class="pet-benchmark-notice error">{{ benchmarkError }}</p>
      </section>
      <label v-if="!isBenchmarkTemplate" class="pet-prompt-box">
        <span>创意 / 对标目标</span>
        <textarea
          v-model="draft.prompt"
          maxlength="500"
          placeholder="输入剧情主题，例如：小猫偷吃零食被发现后，用无辜表情和轻微动作完成反转。"
        />
      </label>
      <aside class="pet-command-card">
        <div class="pet-command-buttons">
          <button
            v-if="isBenchmarkTemplate"
            type="button"
            class="primary pet-benchmark-start-button"
            :disabled="!canStartBenchmarkProduction || benchmarkParsing || benchmarkUploading || busy || creating"
            :title="benchmarkStartDisabledReason"
            @click="handleStartBenchmarkProduction"
          >
            {{ benchmarkPrimaryButtonLabel }}
          </button>
          <button v-if="!isBenchmarkTemplate" type="button" class="primary" :disabled="busy || benchmarkParsing" @click="handleGenerateScript">
            {{ busy ? '处理中...' : 'AI 生成脚本' }}
          </button>
          <button v-if="!isBenchmarkTemplate" type="button" :disabled="busy || benchmarkParsing" @click="handleGenerateStoryboard">
            {{ busy ? '处理中...' : 'AI 生成分镜' }}
          </button>
          <button v-if="!isBenchmarkTemplate" type="button" :disabled="busy || benchmarkParsing" @click="handleBenchmarkStoryboard">
            {{ busy ? '处理中...' : '爆款结构重排' }}
          </button>
        </div>
        <div class="pet-ready-state" :class="{ warn: firstBlockingIssue }">
          <strong>{{ firstBlockingIssue ? '待补齐' : '可进入预检' }}</strong>
          <span>{{ firstBlockingIssue?.message || '脚本、分镜和素材会在确认抽屉里再次校验。' }}</span>
        </div>
      </aside>
    </section>

    <section class="pet-metric-strip">
      <article>
        <span>模板</span>
        <strong>{{ templateTitle }}</strong>
      </article>
      <article>
        <span>分镜</span>
        <strong>{{ validShotCount }} / {{ draft.shots.length }}</strong>
      </article>
      <article>
        <span>素材</span>
        <strong>{{ materialCount }} 个</strong>
      </article>
      <article>
        <span>总时长</span>
        <strong>{{ totalShotSeconds }} 秒</strong>
      </article>
      <article>
        <span>模式</span>
        <strong>{{ generationModeLabel }}</strong>
      </article>
    </section>

    <div class="pet-storyboard-layout">
      <aside class="pet-left-column">
        <section class="pet-panel pet-script-panel">
          <div class="pet-panel-head">
            <div>
              <h3>脚本草稿</h3>
              <small>{{ scriptCharCount }} 字</small>
            </div>
          </div>
          <textarea
            v-model="draft.scriptText"
            class="pet-script-input"
            maxlength="1000"
            placeholder="生成脚本后会显示在这里，也可以手动编辑。建议保留开场钩子、情绪递进和结尾反转。"
          />
          <div class="pet-topic-tags">
            <span v-for="chip in workflowChips" :key="chip">#{{ chip }}</span>
          </div>
        </section>

        <section class="pet-panel pet-material-brief">
          <div class="pet-panel-head">
            <div>
              <h3>素材与画面锚点</h3>
              <small>生成时优先保持主宠身份一致</small>
            </div>
            <button type="button" @click="saveAndGoRole">补素材</button>
          </div>
          <div class="pet-material-list">
            <article>
              <span>主宠物</span>
              <strong>{{ mainPetMaterial?.label || '未添加主宠物参考' }}</strong>
            </article>
            <article>
              <span>场景参考</span>
              <strong>{{ sceneCount }} 个</strong>
            </article>
            <article>
              <span>人物/主人</span>
              <strong>{{ humanAvatarCount }} 个</strong>
            </article>
            <article>
              <span>产品/道具</span>
              <strong>{{ propCount }} 个</strong>
            </article>
          </div>
        </section>
      </aside>

      <section class="pet-panel pet-shot-panel">
        <div class="pet-panel-head">
          <div>
            <h3>分镜列表</h3>
            <small>共 {{ draft.shots.length }} 个分镜，预计 {{ totalShotSeconds }} 秒</small>
          </div>
          <button type="button" :disabled="busy" @click="addShot">新增镜头</button>
        </div>
        <div v-if="draft.shots.length === 0" class="pet-empty-state">
          <strong>暂无分镜</strong>
          <p>先生成脚本或分镜，再进入确认生成。正式提交前仍会检查镜头数量、画面描述、动作和字幕。</p>
        </div>
        <div v-else class="pet-shot-list">
          <article v-for="shot in draft.shots" :key="shot.id" class="pet-shot-card">
            <div class="pet-shot-preview">
              <strong>{{ String(shot.index).padStart(2, '0') }}</strong>
              <input
                v-model.number="shot.durationSeconds"
                class="pet-shot-duration-input"
                type="number"
                :min="PET_MIN_SHOT_DURATION_SECONDS"
                :max="PET_MAX_SHOT_DURATION_SECONDS"
                step="1"
                @blur="normalizeShotDuration(shot)"
                @change="normalizeShotDuration(shot)"
              />
              <span>{{ shot.cameraMove || '待设运镜' }}</span>
            </div>
            <div class="pet-shot-content">
              <label class="wide">
                画面描述
                <textarea v-model="shot.frameDescription" />
              </label>
              <label class="wide">
                角色动作
                <textarea v-model="shot.characterAction" />
              </label>
              <div class="pet-shot-meta">
                <label>
                  运镜方式
                  <input v-model="shot.cameraMove" />
                </label>
                <label>
                  字幕
                  <input v-model="shot.subtitle" />
                </label>
                <label>
                  配音情绪
                  <input v-model="shot.voiceEmotion" placeholder="例如：委屈 / 撒娇 / 惊讶" />
                </label>
              </div>
            </div>
          </article>
        </div>
      </section>

      <aside class="pet-right-column">
        <section class="pet-panel pet-check-panel">
          <div class="pet-panel-head">
            <div>
              <h3>生成检查</h3>
              <small>{{ firstBlockingIssue ? '仍有阻塞项' : '核心输入已满足' }}</small>
            </div>
          </div>
          <ul class="pet-check-list">
            <li v-for="item in checklist" :key="item.label" :class="{ ok: item.ok, warn: !item.ok }">
              <b>{{ item.ok ? '✓' : '!' }}</b>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </section>

        <PetGenerationParamPanel
          :draft="draft"
          compact
          show-mode
          @change="handleGenerationParamChange"
        />

        <PetPostProductionPanel
          :draft="draft"
          compact
          show-sync-button
          @change="saveDraft"
        />
      </aside>
    </div>

    <div class="pet-actions">
      <button type="button" :disabled="busy || creating" @click="saveAndGoRole">返回角色/素材</button>
      <button type="button" :disabled="busy || creating" @click="openPlanPreview">
        {{ creating ? '提交中...' : '确认并生成' }}
      </button>
    </div>

    <PetPlanPreviewDrawer
      v-model="planOpen"
      :draft="draft"
      :estimate="planEstimate"
      :preview="planPreview"
      :loading="creating"
      :preview-loading="previewing"
      :api-mode="apiMode"
      @preview="runPlanPreview"
      @confirm="confirmCreateTask"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import VideoPlatformTabs from '../../components/business/VideoPlatformTabs.vue'
import PetMaterialPicker from './components/PetMaterialPicker.vue'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import PetPostProductionPanel from './components/PetPostProductionPanel.vue'
import PetGenerationParamPanel from './components/PetGenerationParamPanel.vue'
import { analyzeVideoScript, analyzeVideoScriptByUrl } from '../../services/videoApi'
import { uploadFile } from '../../services/uploadApi'
import { cancelTask } from '../../services/taskApi'
import { trackTaskResult } from '../../services/taskRealtime'
import { notifyAuthRefresh } from '../../services/authRefreshHub'
import {
  createPetVideoTask,
  estimatePetVideoCost,
  generatePetScript,
  generatePetStoryboard,
  getPetCreationApiMode,
  previewPetVideoTask,
} from '../../services/petCreationApi'
import { usePetCreationState } from './usePetCreationState'
import type { PetReferenceMaterial, PetStoryboardShot, PetVideoEstimate, PetVideoPreview } from './petCreationTypes'
import {
  PET_MAX_SHOT_DURATION_SECONDS,
  PET_MIN_SHOT_DURATION_SECONDS,
  hasMainPetMaterial,
  hasPrompt,
  normalizePetShotDurationSeconds,
  normalizePetVideoDurationSeconds,
  petErrorMessage,
  promptRequiredMessage,
  validatePetCreationDraft,
  validStoryboardShots,
} from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'
import { findPetTemplate } from './petTemplateConfig'
import {
  applyVideoBenchmarkToPetDraft,
  detectPetBenchmarkPlatform,
  getPetBenchmarkPlatformOption,
  petBenchmarkPlatformOptions,
} from './petBenchmarkVideo'
import { autoMatchPetMaterials, type PetAutoMatchRole } from './petAssetAutoMatch'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import type { TaskItem } from '../../types/taskTypes'
import type { VideoScriptAnalyzeResult, VideoScriptShotItem } from '../../types/videoTypes'

const route = useRoute()
const router = useRouter()
const { draft, applyTemplate, loadDraft, saveDraft, snapshotDraft } = usePetCreationState()
const busy = ref(false)
const creating = ref(false)
const planOpen = ref(false)
const planEstimate = ref<PetVideoEstimate | null>(null)
const planPreview = ref<PetVideoPreview | null>(null)
const previewing = ref(false)
const apiMode = getPetCreationApiMode()
type BenchmarkSourceMode = 'url' | 'upload'
const benchmarkSourceMode = ref<BenchmarkSourceMode>('url')
const benchmarkUrl = ref('')
const benchmarkFileInputRef = ref<HTMLInputElement | null>(null)
const benchmarkUploadFileName = ref('')
const benchmarkUploadedVideoUrl = ref('')
const benchmarkUploading = ref(false)
const benchmarkUploadProgressPercent = ref<number | null>(null)
const benchmarkUploadProgressText = ref('')
const selectedBenchmarkPlatform = ref('auto')
const benchmarkParsing = ref(false)
const benchmarkCanceling = ref(false)
const benchmarkStage = ref('')
const benchmarkError = ref('')
const benchmarkAutoHint = ref('')
const parsedBenchmarkShotCount = ref(0)
let stopBenchmarkTracking: (() => void) | null = null
let benchmarkAbort: AbortController | null = null
let benchmarkUploadAbort: AbortController | null = null
let benchmarkRunSeq = 0
let benchmarkUploadSeq = 0
let currentBenchmarkTaskId: number | null = null
const totalShotSeconds = computed(() => draft.shots.reduce((sum, shot) => sum + Number(shot.durationSeconds || 0), 0))
const template = computed(() => findPetTemplate(String(draft.templateId || route.query.templateId || '')))
const isBenchmarkTemplate = computed(() => String(draft.templateId || route.query.templateId || '') === 'viral-benchmark-storyboard')
const templateTitle = computed(() => template.value?.title || '脚本与分镜')
const styleLabel = computed(() => {
  const labels = {
    realistic: '写实',
    cute: '可爱',
    anime: '动漫',
    anthropomorphic: '拟人',
    funny: '搞笑',
    healing: '治愈',
  }
  return labels[draft.style] || draft.style
})
const generationModeLabel = computed(() => {
  const labels = {
    reference_video: '参考图生成',
    text_video: '纯文本生成',
    dialogue_video: '对话视频',
    image_to_video: '图生视频',
  }
  return labels[draft.generationMode] || draft.generationMode
})
const isHumanPetStory = computed(() => draft.materials.some((item) => (
  item.role === 'human_avatar' && Boolean(item.assetId || item.url)
)))
const pageDescription = computed(() => {
  if (isHumanPetStory.value) return '已根据人物图片自动进入人宠情景模式，围绕主人与宠物互动组织脚本、分镜、字幕和生成约束。'
  if (draft.templateId === 'viral-benchmark-storyboard') return '按爆款短视频的钩子、递进、包袱结构重排镜头，适合搞笑和反差萌内容。'
  if (draft.templateId === 'pet-ai-smart-story') return '根据提示词自动沉淀脚本与分镜，用户可继续微调镜头、字幕、后期参数后生成。'
  return '将剧情拆成镜头、动作、运镜、字幕和配音情绪，便于后续生成视频。'
})
const workflowChips = computed(() => {
  if (isHumanPetStory.value) return ['人宠模式', '主宠一致', '人物参考', '互动剧情']
  if (draft.templateId === 'viral-benchmark-storyboard') return ['前三秒钩子', '情绪递进', '结尾反转', '字幕安全区']
  if (draft.templateId === 'pet-ai-smart-story') return ['提示词理解', 'AI 文案', '自动分镜', '可编辑生成']
  return ['镜头节奏', '动作稳定', '宠物一致性', '低幅运动']
})
const validShotCount = computed(() => validStoryboardShots(draft).length)
const materialCount = computed(() => draft.materials.filter((item) => item.assetId || item.url).length)
const scriptCharCount = computed(() => draft.scriptText?.trim().length || 0)
const mainPetMaterial = computed(() => draft.materials.find((item) => item.role === 'main_pet' && (item.assetId || item.url)))
const sceneCount = computed(() => draft.materials.filter((item) => item.role === 'scene' && (item.assetId || item.url)).length)
const humanAvatarCount = computed(() => draft.materials.filter((item) => item.role === 'human_avatar' && (item.assetId || item.url)).length)
const propCount = computed(() => draft.materials.filter((item) => item.role === 'prop' && (item.assetId || item.url)).length)
const validation = computed(() => validatePetCreationDraft(draft))
const firstBlockingIssue = computed(() => validation.value.blockingIssues[0])
const checklist = computed(() => [
  { label: '创意描述已填写', ok: hasPrompt(draft) },
  { label: draft.generationMode === 'text_video' ? '已选择纯文本生成' : '主宠物参考图已添加', ok: draft.generationMode === 'text_video' || hasMainPetMaterial(draft) },
  { label: '至少 3 个有效分镜', ok: validShotCount.value >= 3 },
  { label: '分镜总时长接近目标', ok: totalShotSeconds.value > 0 && Math.abs(totalShotSeconds.value - draft.durationSeconds) <= Math.max(3, draft.durationSeconds * 0.35) },
  { label: '后期字幕/配音规则可预检', ok: !firstBlockingIssue.value || !['subtitleEnabled', 'voiceEnabled', 'lipSyncEnabled'].includes(firstBlockingIssue.value.field) },
])

const benchmarkVideoPlaceholder = computed(() => getPetBenchmarkPlatformOption(selectedBenchmarkPlatform.value).placeholder)
const selectedBenchmarkLimitReason = computed(() => getPetBenchmarkPlatformOption(selectedBenchmarkPlatform.value).limitReason || '')
const canParseBenchmarkUrl = computed(() => Boolean(benchmarkUrl.value.trim()) && !selectedBenchmarkLimitReason.value)
const canParseBenchmarkUpload = computed(() => Boolean(benchmarkUploadedVideoUrl.value.trim()) && !benchmarkUploading.value)
const canStartBenchmarkProduction = computed(() => (
  benchmarkSourceMode.value === 'upload' ? canParseBenchmarkUpload.value : canParseBenchmarkUrl.value
))
const benchmarkStartDisabledReason = computed(() => {
  if (benchmarkSourceMode.value === 'upload') {
    if (benchmarkUploading.value) return '本地视频正在上传'
    if (!benchmarkUploadedVideoUrl.value.trim()) return '请先选择并上传本地视频'
    return ''
  }
  return selectedBenchmarkLimitReason.value || (!benchmarkUrl.value.trim() ? '请先粘贴视频链接' : '')
})
const benchmarkPrimaryButtonLabel = computed(() => {
  if (benchmarkUploading.value) return benchmarkUploadProgressText.value || '上传中...'
  if (benchmarkParsing.value) return benchmarkStage.value || '爆款对标生产中...'
  return '开始进行爆款对标生产'
})
const storyboardInitialMaterialRole = computed<PetReferenceMaterial['role']>(() => (
  isHumanPetStory.value ? 'human_avatar' : 'main_pet'
))

usePetApiFallbackNotice()

watch(benchmarkUrl, (value) => {
  const detected = detectPetBenchmarkPlatform(value)
  if (!detected) {
    benchmarkAutoHint.value = ''
    return
  }
  selectedBenchmarkPlatform.value = detected
  benchmarkAutoHint.value = `已自动识别为 ${getPetBenchmarkPlatformOption(detected).label}`
})

watch(benchmarkSourceMode, () => {
  benchmarkError.value = ''
  benchmarkAutoHint.value = ''
})

async function handleParseBenchmarkUrl() {
  if (!canParseBenchmarkUrl.value || benchmarkParsing.value || busy.value || creating.value) return
  if (selectedBenchmarkLimitReason.value) {
    benchmarkError.value = selectedBenchmarkLimitReason.value
    return
  }
  const targetUrl = benchmarkUrl.value.trim()
  await runBenchmarkAnalyze(
    (signal) => analyzeVideoScriptByUrl(targetUrl, selectedBenchmarkPlatform.value, { signal }),
    targetUrl,
  )
}

async function handleStartBenchmarkProduction() {
  if (benchmarkSourceMode.value === 'upload') {
    await handleParseBenchmarkUpload()
    return
  }
  await handleParseBenchmarkUrl()
}

async function handleParseBenchmarkUpload() {
  if (!canParseBenchmarkUpload.value || benchmarkParsing.value || benchmarkUploading.value || busy.value || creating.value) return
  const targetUrl = normalizePublicMediaUrl(benchmarkUploadedVideoUrl.value.trim())
  if (!targetUrl) {
    benchmarkError.value = '请先选择并上传本地视频'
    return
  }
  await runBenchmarkAnalyze(
    (signal) => analyzeVideoScript(targetUrl, { signal }),
    targetUrl,
  )
}

async function handleBenchmarkFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const uploadId = ++benchmarkUploadSeq
  benchmarkUploadAbort?.abort()
  benchmarkUploadedVideoUrl.value = ''
  benchmarkUploadFileName.value = ''
  benchmarkUploadProgressPercent.value = null
  benchmarkUploadProgressText.value = ''
  benchmarkError.value = ''

  if (!file) return
  if (!isSupportedBenchmarkVideoFile(file)) {
    benchmarkError.value = '请选择 MP4、MOV、WEBM、M4V、AVI 或 MKV 视频文件'
    input.value = ''
    return
  }
  const maxBytes = 100 * 1024 * 1024
  if (file.size > maxBytes) {
    benchmarkError.value = `视频文件不能超过 ${formatBenchmarkFileSize(maxBytes)}`
    input.value = ''
    return
  }

  const controller = new AbortController()
  benchmarkUploadAbort = controller
  benchmarkUploading.value = true
  benchmarkUploadFileName.value = `${file.name}（${formatBenchmarkFileSize(file.size)}）`
  benchmarkUploadProgressPercent.value = 0
  benchmarkUploadProgressText.value = '准备上传'
  try {
    const uploaded = await uploadFile(file, {
      storage: 'local',
      signal: controller.signal,
      onProgress(progress) {
        if (uploadId !== benchmarkUploadSeq) return
        benchmarkUploadProgressPercent.value = progress.percent
        benchmarkUploadProgressText.value =
          progress.phase === 'processing'
            ? '上传完成，正在保存视频'
            : progress.percent == null
              ? '正在上传视频'
              : `正在上传视频 ${progress.percent}%`
      },
    })
    if (uploadId !== benchmarkUploadSeq) return
    benchmarkUploadedVideoUrl.value = normalizePublicMediaUrl(uploaded.previewUrl)
    benchmarkUploadProgressPercent.value = 100
    benchmarkUploadProgressText.value = '上传完成，可开始生产'
  } catch (error) {
    if (uploadId !== benchmarkUploadSeq) return
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      benchmarkError.value = error instanceof Error ? error.message : '本地视频上传失败'
    }
    input.value = ''
    benchmarkUploadFileName.value = ''
    benchmarkUploadedVideoUrl.value = ''
    benchmarkUploadProgressPercent.value = null
    benchmarkUploadProgressText.value = ''
  } finally {
    if (uploadId === benchmarkUploadSeq) {
      benchmarkUploading.value = false
      if (benchmarkUploadAbort === controller) benchmarkUploadAbort = null
    }
  }
}

function cancelBenchmarkUpload() {
  benchmarkUploadSeq += 1
  benchmarkUploadAbort?.abort()
  benchmarkUploadAbort = null
  benchmarkUploading.value = false
  benchmarkUploadedVideoUrl.value = ''
  benchmarkUploadFileName.value = ''
  benchmarkUploadProgressPercent.value = null
  benchmarkUploadProgressText.value = ''
  if (benchmarkFileInputRef.value) benchmarkFileInputRef.value.value = ''
}

function isSupportedBenchmarkVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name)
}

function formatBenchmarkFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function runBenchmarkAnalyze(
  submit: (signal: AbortSignal) => Promise<TaskItem>,
  targetUrl: string,
) {
  const runId = ++benchmarkRunSeq
  stopBenchmarkParseTask()
  benchmarkAbort?.abort()
  benchmarkAbort = new AbortController()
  currentBenchmarkTaskId = null
  benchmarkParsing.value = true
  benchmarkCanceling.value = false
  benchmarkError.value = ''
  parsedBenchmarkShotCount.value = 0

  try {
    benchmarkStage.value = '提交解析任务中...'
    const task = await submit(benchmarkAbort.signal)
    if (runId !== benchmarkRunSeq) return
    currentBenchmarkTaskId = task.taskId
    notifyAuthRefresh()
    benchmarkStage.value = benchmarkStatusStage(task.status, task.progress)
    await new Promise<void>((resolve) => {
      stopBenchmarkTracking = trackTaskResult<VideoScriptAnalyzeResult>(task.taskId, {
        onStatus(message) {
          if (runId !== benchmarkRunSeq) return
          benchmarkStage.value = benchmarkStatusStage(message.status, message.progress)
        },
        onResult(taskResult) {
          if (runId !== benchmarkRunSeq) return
          void handleBenchmarkAnalyzeResult(runId, taskResult.result?.scripts || [], targetUrl)
            .finally(resolve)
          return
          const sourceShots = taskResult.result?.scripts || []
          if (sourceShots.length === 0) {
            benchmarkError.value = '解析完成，但没有返回可用分镜。请换一个公开可访问的视频链接。'
            finishBenchmarkRun()
            resolve()
            return
          }
          const applied = applyVideoBenchmarkToPetDraft(draft, sourceShots, targetUrl)
          parsedBenchmarkShotCount.value = applied.shotCount
          void saveDraft()
          ElMessage.success(`已解析并套用 ${applied.shotCount} 个萌宠分镜`)
          finishBenchmarkRun()
          notifyAuthRefresh()
          resolve()
        },
        onFailure(message) {
          if (runId !== benchmarkRunSeq) return
          benchmarkError.value = message.errorMessage || '链接分镜解析任务失败'
          finishBenchmarkRun()
          notifyAuthRefresh()
          resolve()
        },
        onError(error) {
          if (runId !== benchmarkRunSeq) return
          benchmarkError.value = error.message
          finishBenchmarkRun()
          notifyAuthRefresh()
          resolve()
        },
      })
    })
  } catch (error) {
    if (runId !== benchmarkRunSeq) return
    if (error instanceof DOMException && error.name === 'AbortError') return
    benchmarkError.value = error instanceof Error ? error.message : '链接解析失败'
    finishBenchmarkRun()
  }
}

async function handleBenchmarkAnalyzeResult(
  runId: number,
  sourceShots: VideoScriptShotItem[],
  targetUrl: string,
) {
  if (runId !== benchmarkRunSeq) return
  if (sourceShots.length === 0) {
    benchmarkError.value = '解析完成，但没有返回可用文案和分镜。请换一个可公开访问的视频链接，或上传本地视频后重试。'
    finishBenchmarkRun()
    return
  }

  const applied = applyVideoBenchmarkToPetDraft(draft, sourceShots, targetUrl)
  parsedBenchmarkShotCount.value = applied.shotCount
  let matchedCount = 0
  const currentTemplate = template.value || findPetTemplate('viral-benchmark-storyboard')
  if (currentTemplate) {
    try {
      matchedCount = await autoMatchPetMaterials(draft, currentTemplate, {
        requiredRoles: benchmarkAutoMatchRoles(sourceShots),
      })
    } catch (error) {
      console.warn('[PetStoryboardPage] benchmark material auto match failed.', error)
    }
  }
  if (runId !== benchmarkRunSeq) return
  await saveDraft()
  const materialText = matchedCount > 0 ? `，并自动补入 ${matchedCount} 个素材` : ''
  ElMessage.success(`已解析视频文案和 ${applied.shotCount} 个分镜${materialText}`)
  finishBenchmarkRun()
  notifyAuthRefresh()
}

function benchmarkAutoMatchRoles(sourceShots: VideoScriptShotItem[]): PetAutoMatchRole[] {
  const text = sourceShots
    .flatMap((shot) => [shot.page, shot.content, shot.highlight, shot.visualPrompt, shot.prompt])
    .join(' ')
    .toLowerCase()
  const roles: PetAutoMatchRole[] = ['main_pet', 'scene']
  if (/主人|人物|女生|男生|女孩|男孩|妈妈|爸爸|姐姐|哥哥|human|person|owner|host/.test(text)) {
    roles.push('human_avatar')
  }
  if (/零食|玩具|用品|道具|罐头|球|食物|产品|snack|toy|food|prop|product/.test(text)) {
    roles.push('prop')
  }
  if (/两只|多只|猫狗|第二|另一只|双宠|多宠|two pets|cat and dog/.test(text)) {
    roles.push('second_pet')
  }
  return [...new Set(roles)]
}

async function cancelBenchmarkParse() {
  const taskId = currentBenchmarkTaskId
  benchmarkRunSeq += 1
  benchmarkAbort?.abort()
  benchmarkAbort = null
  stopBenchmarkParseTask()
  currentBenchmarkTaskId = null
  benchmarkParsing.value = false
  benchmarkStage.value = ''
  if (!taskId) {
    benchmarkCanceling.value = false
    return
  }
  benchmarkCanceling.value = true
  try {
    await cancelTask(taskId)
    notifyAuthRefresh()
  } catch (error) {
    benchmarkError.value = error instanceof Error ? error.message : '取消解析失败'
  } finally {
    benchmarkCanceling.value = false
  }
}

function stopBenchmarkParseTask() {
  if (stopBenchmarkTracking) {
    stopBenchmarkTracking()
    stopBenchmarkTracking = null
  }
}

function finishBenchmarkRun() {
  benchmarkParsing.value = false
  currentBenchmarkTaskId = null
  benchmarkStage.value = ''
}

function benchmarkStatusStage(status: string, progress: number | null) {
  if (status === 'QUEUED') return '排队中...'
  if (status === 'RUNNING') return progress != null ? `解析分镜中...${progress}%` : '解析分镜中...'
  return '解析分镜中...'
}

async function applyRouteTemplateIfNeeded() {
  const nextTemplate = findPetTemplate(String(route.query.templateId || ''))
  if (!nextTemplate || draft.templateId === nextTemplate.id) return
  applyTemplate(nextTemplate)
  await saveDraft()
}

function addShot() {
  const index = draft.shots.length + 1
  const shot: PetStoryboardShot = {
    id: `shot-${Date.now()}`,
    index,
    durationSeconds: 3,
    frameDescription: index === 1 ? '开场直接给出宠物反应画面' : '补充一个宠物动作或表情递进镜头',
    characterAction: '主宠保持身份一致，动作轻微自然',
    cameraMove: '稳定近景',
    subtitle: '',
    voiceEmotion: '自然',
  }
  draft.shots.push(shot)
}

async function handleMaterialsChange() {
  try {
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存宠物素材选择失败，请稍后重试。'))
  }
}

async function handleGenerationParamChange() {
  try {
    normalizeStoryboardDurations()
    syncShotDurationsToTarget()
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存生成参数失败，请稍后重试。'))
  }
}

async function handleGenerateScript() {
  if (busy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  normalizeStoryboardDurations()
  busy.value = true
  try {
    const nextDraft = await generatePetScript(snapshotDraft())
    Object.assign(draft, nextDraft)
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物脚本失败，请稍后重试。'))
  } finally {
    busy.value = false
  }
}

async function handleGenerateStoryboard() {
  if (busy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  normalizeStoryboardDurations()
  busy.value = true
  try {
    const nextDraft = await generatePetStoryboard(snapshotDraft())
    Object.assign(draft, nextDraft)
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物分镜失败，请稍后重试。'))
  } finally {
    busy.value = false
  }
}

async function handleBenchmarkStoryboard() {
  if (busy.value || creating.value) return
  const basePrompt = draft.prompt.trim() || '主宠被发现做了一件小坏事，努力用可爱表情解释'
  draft.prompt = `${basePrompt}。参考爆款萌宠短视频结构：前三秒抛出反差钩子，中段用宠物表情和动作递进，结尾用治愈或反转包袱收束。`
  draft.visualSettings.cameraRhythm = 'short_drama'
  draft.visualSettings.expressionIntensity = Math.max(draft.visualSettings.expressionIntensity, 84)
  draft.subtitleEnabled = true
  await handleGenerateStoryboard()
}

async function saveAndGoRole() {
  if (busy.value || creating.value) return
  try {
    await saveDraft()
    void router.push({ name: 'pet-role-setup', query: { ...route.query, returnTo: route.fullPath } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存分镜失败，请稍后重试。'))
  }
}

async function openPlanPreview() {
  if (busy.value || creating.value) return
  normalizeStoryboardDurations()
  planOpen.value = true
  planEstimate.value = null
  planPreview.value = null
  try {
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
    const currentValidation = validatePetCreationDraft(draft)
    if (currentValidation.blockingIssues[0]) {
      ElMessage.warning(currentValidation.blockingIssues[0].message)
      return
    }
    planEstimate.value = await estimatePetVideoCost(snapshotDraft())
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频积分预估失败，请稍后重试。'))
  }
}

async function runPlanPreview() {
  if (busy.value || creating.value || previewing.value) return
  normalizeStoryboardDurations()
  const currentValidation = validatePetCreationDraft(draft)
  if (currentValidation.blockingIssues[0]) {
    ElMessage.warning(currentValidation.blockingIssues[0].message)
    return
  }
  if (planEstimate.value?.enoughBalance === false) {
    ElMessage.warning('当前积分余额不足，请充值或降低生成配置后再提交。')
    return
  }
  previewing.value = true
  try {
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
    planPreview.value = await previewPetVideoTask(snapshotDraft())
    if (planPreview.value.providerSubmitEnabled) {
      ElMessage.success('预检通过。继续确认将调用第三方视频生成并可能产生费用。')
      return
    }
    ElMessage.warning('当前为本地安全测试模式，未调用第三方视频生成。')
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频 dry-run 预检失败，请稍后重试。'))
  } finally {
    previewing.value = false
  }
}

async function confirmCreateTask() {
  if (busy.value || creating.value || previewing.value) return
  normalizeStoryboardDurations()
  const currentValidation = validatePetCreationDraft(draft)
  if (currentValidation.blockingIssues[0]) {
    ElMessage.warning(currentValidation.blockingIssues[0].message)
    return
  }
  if (planEstimate.value?.enoughBalance === false) {
    ElMessage.warning('当前积分余额不足，请充值或降低生成配置后再提交。')
    return
  }
  if (!planPreview.value) {
    await runPlanPreview()
    if (!planPreview.value) return
  }
  if (!planPreview.value.providerSubmitEnabled) {
    ElMessage.warning('当前为本地安全测试模式，未调用第三方视频生成。需要真实生成时，请先由管理员开启 provider submit 并再次确认。')
    return
  }
  creating.value = true
  try {
    await ElMessageBox.confirm(
      '将调用第三方视频生成并可能产生费用。本次只生成 1 条，确认后不可撤销。是否继续？',
      '确认真实生成',
      {
        confirmButtonText: '确认真实生成 1 条',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    creating.value = false
    return
  }
  try {
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
    const task = await createPetVideoTask(snapshotDraft())
    planOpen.value = false
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '创建宠物视频任务失败，请稍后重试。'))
  } finally {
    creating.value = false
  }
}

function normalizeShotDuration(shot: PetStoryboardShot) {
  shot.durationSeconds = normalizePetShotDurationSeconds(shot.durationSeconds)
}

function normalizeStoryboardDurations() {
  draft.durationSeconds = normalizePetVideoDurationSeconds(draft.durationSeconds)
  draft.shots.forEach(normalizeShotDuration)
}

function syncShotDurationsToTarget() {
  if (draft.shots.length === 0) return
  const target = normalizePetVideoDurationSeconds(draft.durationSeconds)
  const base = Math.max(PET_MIN_SHOT_DURATION_SECONDS, Math.floor(target / draft.shots.length))
  const durations = draft.shots.map(() => base)
  let remaining = target - base * draft.shots.length
  let index = 0
  while (remaining > 0 && durations.length > 0) {
    durations[index % durations.length] += 1
    remaining -= 1
    index += 1
  }
  draft.shots.forEach((shot, shotIndex) => {
    shot.durationSeconds = normalizePetShotDurationSeconds(durations[shotIndex], shot.durationSeconds)
  })
}

onBeforeUnmount(() => {
  benchmarkAbort?.abort()
  benchmarkUploadAbort?.abort()
  stopBenchmarkParseTask()
})

onMounted(async () => {
  if (findPetTemplate(String(route.query.templateId || ''))?.id === 'pet-sticker') {
    void router.replace({ name: 'pet-sticker-create', query: route.query })
    return
  }
  try {
    await loadDraft()
    normalizeStoryboardDurations()
    await applyRouteTemplateIfNeeded()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，请返回首页重试。'))
  }
  if (!isBenchmarkTemplate.value && draft.shots.length === 0 && hasPrompt(draft)) {
    await handleGenerateStoryboard()
  }
})
</script>

<style scoped>
.pet-storyboard-page,
.pet-panel,
.pet-shot-list,
.pet-empty-state {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.pet-page-head,
.pet-panel,
.pet-command-board,
.pet-metric-strip,
.pet-actions {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
}

.pet-page-head span,
.pet-prompt-box span,
.pet-material-list span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-page-head h2,
.pet-panel h3 {
  margin: 0;
  color: #172033;
  font-weight: 900;
}

.pet-page-head h2 {
  margin-top: 6px;
  font-size: 20px;
}

.pet-page-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-head-meta {
  display: grid;
  min-width: 120px;
  justify-items: end;
  gap: 4px;
  color: #667085;
  font-size: 12px;
}

.pet-head-meta strong {
  color: #2563eb;
  font-size: 18px;
}

.pet-production-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.pet-production-steps span {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #667085;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
}

.pet-production-steps b {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.pet-production-steps .active {
  border-color: #bfdbfe;
  background: #f8fbff;
  color: #172033;
}

.pet-command-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  padding: 16px;
}

.pet-command-board.is-benchmark-mode {
  grid-template-columns: 1fr;
}

.pet-command-board.is-benchmark-mode .pet-command-card {
  grid-column: 1 / -1;
}

.pet-command-board.is-benchmark-mode .pet-command-buttons {
  justify-items: end;
}

.pet-benchmark-start-button {
  width: min(360px, 100%);
}

.pet-benchmark-link-panel {
  display: grid;
  grid-column: 1 / -1;
  gap: 10px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 12px;
}

.pet-benchmark-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pet-benchmark-head div {
  display: grid;
  gap: 4px;
}

.pet-benchmark-head strong {
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-benchmark-head span,
.pet-benchmark-head em,
.pet-benchmark-notice {
  color: #667085;
  font-size: 12px;
  font-style: normal;
  line-height: 1.55;
}

.pet-benchmark-head em {
  color: #2563eb;
  font-weight: 850;
  white-space: nowrap;
}

.pet-benchmark-platform-tabs {
  margin-bottom: 0;
}

.pet-benchmark-source-tabs {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(110px, 1fr));
  width: min(360px, 100%);
  gap: 4px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #f8fafc;
  padding: 4px;
}

.pet-benchmark-source-tabs button {
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-benchmark-source-tabs button.active {
  border-color: #bfdbfe;
  background: #ffffff;
  color: #2563eb;
}

.pet-benchmark-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.pet-benchmark-link-row input {
  min-width: 0;
  min-height: 40px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 12px;
  outline: none;
}

.pet-benchmark-link-row input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pet-benchmark-link-row button {
  min-height: 40px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-benchmark-link-row button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.pet-benchmark-upload-panel {
  display: grid;
  gap: 10px;
}

.pet-benchmark-file-picker {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 46px;
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px 12px;
  cursor: pointer;
}

.pet-benchmark-file-picker.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pet-benchmark-file-picker input {
  display: none;
}

.pet-benchmark-file-picker span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  border-radius: 6px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
}

.pet-benchmark-file-picker strong {
  overflow: hidden;
  color: #475467;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-benchmark-upload-progress {
  display: grid;
  gap: 7px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-benchmark-upload-progress div {
  position: relative;
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #dbeafe;
}

.pet-benchmark-upload-progress div span {
  position: absolute;
  inset: 0 auto 0 0;
  min-width: 8px;
  border-radius: inherit;
  background: #2563eb;
  transition: width 160ms ease;
}

.pet-benchmark-cancel-row,
.pet-benchmark-cancel-upload {
  justify-self: start;
}

.pet-benchmark-cancel-row button,
.pet-benchmark-cancel-upload {
  min-height: 36px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-benchmark-notice {
  margin: 0;
}

.pet-benchmark-notice.warn {
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 8px 10px;
}

.pet-benchmark-notice.error {
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  padding: 8px 10px;
}

.pet-prompt-box,
.pet-script-panel {
  display: grid;
  gap: 10px;
}

.pet-prompt-box textarea {
  min-height: 104px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.65;
}

.pet-command-card {
  display: grid;
  align-content: start;
  gap: 10px;
}

.pet-command-buttons {
  display: grid;
  gap: 8px;
}

.pet-command-buttons button,
.pet-panel-head button,
.pet-actions button {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-command-buttons button.primary,
.pet-actions button:last-child {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.pet-ready-state {
  display: grid;
  gap: 4px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  padding: 10px 12px;
}

.pet-ready-state.warn {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.pet-ready-state strong {
  font-size: 13px;
  font-weight: 900;
}

.pet-ready-state span {
  font-size: 12px;
  line-height: 1.45;
}

.pet-metric-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  padding: 0;
}

.pet-metric-strip article {
  display: grid;
  gap: 4px;
  min-height: 60px;
  align-content: center;
  background: #ffffff;
  padding: 10px 14px;
}

.pet-metric-strip span,
.pet-panel-head small {
  color: #667085;
  font-size: 12px;
}

.pet-metric-strip strong,
.pet-material-list strong {
  overflow: hidden;
  color: #172033;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-storyboard-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr) 310px;
  gap: 16px;
  align-items: start;
  min-width: 0;
}

.pet-left-column,
.pet-right-column {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.pet-right-column {
  position: sticky;
  top: 18px;
  max-height: calc(100vh - 36px);
  overflow-y: auto;
  scrollbar-width: thin;
}

.pet-panel {
  min-width: 0;
  padding: 16px;
}

.pet-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-panel-head > div {
  display: grid;
  gap: 3px;
}

.pet-script-input {
  min-height: 230px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 12px;
  font-size: 13px;
  line-height: 1.65;
}

.pet-topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-topic-tags span {
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-material-list {
  display: grid;
  gap: 8px;
}

.pet-material-list article {
  display: grid;
  gap: 3px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px 12px;
}

.pet-shot-list {
  gap: 12px;
  max-height: min(760px, calc(100vh - 220px));
  overflow-y: auto;
  padding-right: 2px;
}

.pet-shot-card {
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 12px;
}

.pet-shot-preview {
  display: grid;
  align-content: start;
  gap: 8px;
}

.pet-shot-preview strong {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #172033;
  font-size: 24px;
  font-weight: 900;
}

.pet-shot-duration-input {
  width: 86px;
}

.pet-shot-preview span {
  display: -webkit-box;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pet-shot-content {
  display: grid;
  min-width: 0;
  gap: 10px;
}

.pet-shot-card label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-shot-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pet-shot-card input,
.pet-shot-card select,
.pet-shot-card textarea {
  min-height: 38px;
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 12px;
  font-size: 13px;
}

.pet-shot-card textarea {
  min-height: 66px;
  max-height: 160px;
  resize: vertical;
  padding: 10px 12px;
  line-height: 1.6;
}

.pet-check-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pet-check-list li {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-check-list li.ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.pet-check-list b {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: #ffffff;
  font-size: 12px;
}

.pet-empty-state {
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  background: #f8fbff;
  padding: 20px;
}

.pet-empty-state strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-empty-state p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-actions {
  position: sticky;
  bottom: 12px;
  z-index: 4;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 88px 12px 12px;
  backdrop-filter: blur(10px);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 1280px) {
  .pet-storyboard-layout {
    grid-template-columns: minmax(280px, 0.42fr) minmax(0, 1fr);
  }

  .pet-right-column {
    grid-column: 1 / -1;
    position: static;
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 980px) {
  .pet-page-head,
  .pet-command-board,
  .pet-storyboard-layout {
    grid-template-columns: 1fr;
  }

  .pet-page-head {
    display: grid;
  }

  .pet-head-meta {
    justify-items: start;
  }

  .pet-production-steps,
  .pet-metric-strip {
    grid-template-columns: 1fr 1fr;
  }

  .pet-benchmark-link-row {
    grid-template-columns: 1fr;
  }

  .pet-shot-card,
  .pet-shot-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .pet-actions {
    padding-right: 12px;
  }
}
</style>

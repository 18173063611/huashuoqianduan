<template>
  <div class="quick-render-page app-page-stack" :class="{ 'quick-render-page--embedded': props.embedded }">
    <header v-if="!props.embedded" class="quick-head">
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

      <div class="quick-source-grid">
        <label class="quick-upload" :class="{ disabled: uploading || busy }">
          <input
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.json,.txt,.srt"
            :disabled="uploading || busy"
            @change="handleFilesSelected"
          />
          <strong>{{ uploading ? '上传中...' : '本地上传素材' }}</strong>
          <small>上传后自动保存到资产中心，并参与一键成片识别。</small>
        </label>
        <AssetPicker
          title="资产中心图片"
          asset-type="IMAGE"
          :selected-url="quickPickedImageUrl"
          :role-options="quickImageRoleOptions"
          placeholder="搜索图片素材..."
          @select="handleAssetCenterSelect"
        />
        <AssetPicker
          title="资产中心车型素材包"
          asset-type="JSON"
          :selected-url="quickPickedCarBundleUrl"
          :asset-roles="['car_model_bundle']"
          :role-options="quickCarBundleRoleOptions"
          placeholder="搜索车型素材包..."
          @select="handleAssetCenterSelect"
        />
        <AssetPicker
          title="资产中心口播/音频"
          asset-type="AUDIO"
          :selected-url="quickPickedAudioUrl"
          :role-options="quickAudioRoleOptions"
          placeholder="搜索口播、参考音频或 BGM..."
          @select="handleAssetCenterSelect"
        />
        <AssetPicker
          title="资产中心分镜/文案"
          asset-type="JSON"
          :selected-url="quickPickedJsonUrl"
          :role-options="quickJsonRoleOptions"
          placeholder="搜索分镜、对标文案..."
          @select="handleAssetCenterSelect"
        />
        <AssetPicker
          title="资产中心文案/TXT"
          asset-type="TEXT"
          :selected-url="quickPickedTextUrl"
          :role-options="quickTextRoleOptions"
          placeholder="搜索口播文案、字幕文本..."
          @select="handleAssetCenterSelect"
        />
        <AssetPicker
          title="资产中心视频"
          asset-type="VIDEO"
          :selected-url="quickPickedVideoUrl"
          :role-options="quickVideoRoleOptions"
          placeholder="搜索视频素材..."
          @select="handleAssetCenterSelect"
        />
      </div>

      <div v-if="materials.length" class="quick-materials">
        <article v-for="item in materials" :key="item.asset.assetId" class="quick-material">
          <div class="quick-material-main">
            <strong>{{ item.asset.fileName }}</strong>
            <small>{{ item.asset.assetType }} · {{ formatSize(item.asset.fileSize) }}</small>
          </div>
          <div class="quick-material-role">
            <strong>{{ roleLabel(item.role) }}</strong>
            <small>系统自动识别</small>
          </div>
          <button type="button" :disabled="busy" @click="removeMaterial(item.asset.assetId)">移除</button>
        </article>
      </div>
    </section>

    <section class="app-card quick-panel">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>智能成片判断</h2>
          <p class="app-muted">系统会按素材类型、文件名和文本内容自动判断链路、字幕、口播和段落数量。</p>
        </div>
      </div>

      <div class="quick-smart-grid">
        <div>
          <span>成片目标</span>
          <strong>{{ routeLabel }}</strong>
          <small>{{ routeHint }}</small>
        </div>
        <div>
          <span>口播</span>
          <strong>{{ audioDecisionLabel }}</strong>
          <small>{{ audioDecisionHint }}</small>
        </div>
        <div v-if="selectedBgmMaterial">
          <span>BGM</span>
          <strong>{{ selectedBgmMaterial.asset.fileName }}</strong>
          <small>后期统一混入</small>
        </div>
        <div>
          <span>字幕</span>
          <strong>{{ subtitleLabel }}</strong>
          <small>{{ subtitleDecisionHint }}</small>
        </div>
        <div>
          <span>讲述语言</span>
          <strong>{{ voiceLanguageLabel }}</strong>
          <small>用于文案生成音视频的模型原生口播</small>
        </div>
        <div>
          <span>段落</span>
          <strong>{{ totalDuration }} 秒</strong>
          <small>{{ segmentCount }} 段，每段 {{ segmentDuration }} 秒</small>
        </div>
      </div>

      <div class="quick-grid quick-grid-compact">
        <div class="quick-field">
          <label>成片比例</label>
          <select v-model="aspectRatio" :disabled="busy">
            <option value="9:16">竖屏 9:16</option>
            <option value="16:9">横屏 16:9</option>
            <option value="auto">跟随素材</option>
          </select>
        </div>
        <div class="quick-field">
          <label>讲述语言</label>
          <select v-model="voiceLanguage" :disabled="busy">
            <option v-for="item in voiceLanguageOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="quick-field">
          <label>字幕语言</label>
          <select v-model="subtitleLanguage" :disabled="busy || subtitleMode === 'off'">
            <option v-for="item in subtitleLanguageOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="quick-field">
        <label>补充目标</label>
        <input v-model.trim="goalText" :disabled="busy" maxlength="120" placeholder="可选，例如：突出空间和低油耗" />
      </div>

      <div v-if="showNarrationPanel" class="quick-narration-panel">
        <div class="quick-narration-head">
          <div>
            <label>最终讲述文案</label>
            <small>{{ narrationPanelHint }}</small>
          </div>
          <button
            v-if="needsNarrationLocalization"
            type="button"
            :disabled="busy || narrationLocalizationLoading || !narrationSourceText"
            @click="regenerateNarrationLocalization"
          >
            {{ narrationLocalizationLoading ? '生成中...' : '重新生成' }}
          </button>
        </div>
        <textarea
          v-model="finalNarrationText"
          :disabled="busy || narrationLocalizationLoading"
          rows="6"
          maxlength="3000"
          placeholder="确认后会作为模型讲述文案和后期字幕文案"
          @input="narrationEdited = true"
        />
        <div v-if="narrationLocalizationLoading" class="quick-progress-row">
          <div class="quick-progress-track">
            <div class="quick-progress-fill" :style="{ width: `${narrationProgressPercent}%` }" />
          </div>
          <span>{{ narrationProgressPercent }}%</span>
        </div>
        <p v-if="narrationError" class="quick-error">{{ narrationError }}</p>
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
          <div v-if="selectedBgmMaterial">
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
          <span v-if="selectedBgmMaterial">BGM：{{ selectedBgmMaterial.asset.fileName }}</span>
        </div>
        <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">打开视频</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getAssetTextContent, uploadMaterialAsset } from '../../services/assetApi'
import { rewriteDouyinCopywriting } from '../../services/writerDouyinApi'
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
  QuickRenderRequest,
  QuickRenderResponse,
  VideoTaskVO,
} from '../../types/videoTypes'
import type { DouyinRewriteWriterVO } from '../../types/writerDouyinTypes'
import AssetPicker from './AssetPicker.vue'

interface QuickMaterial {
  asset: AssetItem
  role: QuickRenderAssetRole
  textContent?: string
}

interface QuickFileLike {
  name: string
  type?: string | null
}

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

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
  { value: 'car_model_bundle', label: '车型素材包' },
  { value: 'material_video', label: '视频素材' },
  { value: 'host_video', label: '口播视频' },
  { value: 'reference_video', label: '参考视频' },
  { value: 'material', label: '普通素材' },
]

const quickImageRoleOptions = roleOptions.filter((item) =>
  item.value.startsWith('car_') || item.value.startsWith('scene_') || item.value === 'host_image',
)
const quickAudioRoleOptions = roleOptions.filter((item) =>
  ['voiceover', 'reference_audio', 'bgm'].includes(item.value),
)
const quickJsonRoleOptions = roleOptions.filter((item) =>
  ['storyboard_json', 'benchmark_json', 'voice_script', 'subtitle'].includes(item.value),
)
const quickCarBundleRoleOptions = roleOptions.filter((item) =>
  item.value === 'car_model_bundle',
)
const quickTextRoleOptions = roleOptions.filter((item) =>
  ['voice_script', 'subtitle'].includes(item.value),
)
const quickVideoRoleOptions = roleOptions.filter((item) =>
  ['material_video', 'host_video', 'reference_video'].includes(item.value),
)

const materials = ref<QuickMaterial[]>([])
const quickPickedImageUrl = ref('')
const quickPickedCarBundleUrl = ref('')
const quickPickedAudioUrl = ref('')
const quickPickedJsonUrl = ref('')
const quickPickedTextUrl = ref('')
const quickPickedVideoUrl = ref('')
const aspectRatio = ref<'9:16' | '16:9' | 'auto'>('9:16')
const subtitleLanguage = ref('zh-CN')
const voiceLanguage = ref<'zh-CN' | 'en-US'>('zh-CN')
const goalText = ref('')
const segmentDuration = 8
const uploading = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const result = ref<VideoTaskVO | null>(null)
const finalNarrationText = ref('')
const narrationEdited = ref(false)
const narrationError = ref('')
const narrationLocalizationLoading = ref(false)
const narrationTaskProgress = ref<number | null>(null)
const narrationResolvedKey = ref('')
let stopTracking: (() => void) | null = null
let stopNarrationTracking: (() => void) | null = null
let digitalHumanPollTimer: number | null = null
let narrationLocalizationPromise: Promise<string> | null = null

const canSubmit = computed(() => materials.value.length > 0 && !uploading.value)
const imageCount = computed(() => materials.value.filter((item) => item.asset.assetType === 'IMAGE').length)
const videoCount = computed(() => materials.value.filter((item) => item.asset.assetType === 'VIDEO').length)
const hasVoiceMaterial = computed(() =>
  materials.value.some((item) => item.role === 'voiceover' || item.role === 'reference_audio' || item.role === 'voice_script'),
)
const hasBgmMaterial = computed(() => materials.value.some((item) => item.role === 'bgm'))
const selectedBgmMaterial = computed(() => materials.value.find((item) => item.role === 'bgm') || null)
const uploadedSubtitleText = computed(() =>
  materials.value.find((item) => item.role === 'subtitle' && item.textContent?.trim())?.textContent?.trim() || '',
)
const narrationSourceText = computed(() => extractNarrationSourceText(materials.value))
const narrationLocalizationKey = computed(() =>
  `${voiceLanguage.value}:${stableTextKey(narrationSourceText.value)}`,
)
const needsNarrationLocalization = computed(() =>
  narrationLanguageMismatch(narrationSourceText.value, voiceLanguage.value),
)
const showNarrationPanel = computed(() =>
  Boolean(narrationSourceText.value || finalNarrationText.value || narrationLocalizationLoading.value),
)
const narrationPanelHint = computed(() => {
  if (narrationLocalizationLoading.value) return `${voiceLanguageLabel.value}生成中`
  if (needsNarrationLocalization.value && finalNarrationText.value) return `已生成${voiceLanguageLabel.value}，可编辑`
  if (needsNarrationLocalization.value) return `需要生成${voiceLanguageLabel.value}`
  return `与${voiceLanguageLabel.value}一致，可编辑`
})
const narrationProgressPercent = computed(() => Math.max(0, Math.min(100, narrationTaskProgress.value ?? 0)))
const subtitleMode = computed<'off' | 'auto' | 'upload'>(() => {
  if (uploadedSubtitleText.value) return 'upload'
  if (hasVoiceMaterial.value) return 'auto'
  return 'off'
})
const subtitleLanguageOptions = [
  { value: 'zh-CN', label: '中文普通话' },
  { value: 'en-US', label: '英语' },
]
const voiceLanguageOptions = [
  { value: 'zh-CN', label: '中文讲述' },
  { value: 'en-US', label: '英语讲述' },
]
const voiceLanguageLabel = computed(
  () => voiceLanguageOptions.find((item) => item.value === voiceLanguage.value)?.label || '中文讲述',
)
const audioPolicy = computed<'auto' | 'none' | 'voiceover' | 'bgm'>(() => (hasVoiceMaterial.value || hasBgmMaterial.value ? 'auto' : 'none'))
const segmentCount = computed(() => {
  if (inferredRoute.value === 'digital_human' || inferredRoute.value === 'general_video') return 1
  if (inferredRoute.value === 'material_mix') return Math.max(1, Math.min(4, videoCount.value || 1))
  return Math.max(2, Math.min(4, imageCount.value || 4))
})
const totalDuration = computed(() => segmentCount.value * segmentDuration)

const inferredRoute = computed(() => {
  if (materials.value.some((item) => item.role === 'car_model_bundle' || item.role.startsWith('car_') || item.role.startsWith('scene_'))) return 'car_sales'
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

const routeHint = computed(() => {
  if (!materials.value.length) return '上传素材后自动判断'
  if (inferredRoute.value === 'car_sales') return '检测到车辆/场景素材，使用视频制作汽车成片链路'
  if (inferredRoute.value === 'digital_human') return '检测到人物图和口播素材，走数字人口播链路'
  if (inferredRoute.value === 'material_mix') return '视频素材占比更高，优先作为素材混剪'
  if (inferredRoute.value === 'general_video') return '图片素材为主，生成通用图生视频'
  return '继续上传图片、音频或视频素材'
})

const subtitleLabel = computed(() => {
  if (subtitleMode.value === 'off') return '关闭'
  if (subtitleMode.value === 'upload') return '使用字幕素材'
  return '自动'
})

const subtitleDecisionHint = computed(() => {
  if (subtitleMode.value === 'upload') return '检测到字幕文件，将作为字幕内容'
  if (subtitleMode.value === 'auto') return '检测到口播素材，自动跟随口播'
  return '未检测到口播或字幕素材'
})

const audioDecisionLabel = computed(() => {
  if (materials.value.some((item) => item.role === 'voiceover')) return '口播优先'
  if (materials.value.some((item) => item.role === 'reference_audio')) return '参考音频'
  if (materials.value.some((item) => item.role === 'voice_script')) return '文案驱动'
  if (hasBgmMaterial.value) return '无口播'
  return '无音频'
})

const audioDecisionHint = computed(() => {
  if (materials.value.some((item) => item.role === 'voiceover')) return '口播音频会作为成片主音轨'
  if (materials.value.some((item) => item.role === 'reference_audio')) return '单段可参考音频，多段转后期配音'
  if (materials.value.some((item) => item.role === 'voice_script')) return '使用文案拆分到各片段'
  if (hasBgmMaterial.value) return '仅使用后期背景音乐'
  return '模型只按图片/视频素材生成画面'
})

const bgmLabel = computed(() => {
  const bgm = selectedBgmMaterial.value
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
      const inferredRole = inferUploadedAssetRoleForMetadata(file)
      const asset = await uploadMaterialAsset(file, {
        metadataJson: JSON.stringify({
          from: 'quick_render_upload',
          assetRole: inferredRole || undefined,
          originalFileName: file.name,
          source: 'quick_render',
        }),
      })
      await appendMaterial(asset, { name: file.name, type: file.type })
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '素材上传失败'
  } finally {
    uploading.value = false
  }
}

async function handleAssetCenterSelect(payload: { asset: AssetItem; url: string }) {
  errorMessage.value = ''
  rememberPickedAssetUrl(payload.asset, payload.url)
  try {
    await appendMaterial(payload.asset, {
      name: payload.asset.fileName || '',
      type: payload.asset.mimeType || '',
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资产加入失败'
  }
}

async function appendMaterial(asset: AssetItem, file: QuickFileLike) {
  if (materials.value.some((item) => item.asset.assetId === asset.assetId)) {
    return
  }
  const material: QuickMaterial = {
    asset,
    role: inferRole(file, asset),
  }
  if (shouldReadText(asset, file)) {
    material.textContent = await readTextContent(asset).catch(() => '')
  }
  materials.value.push(material)
}

function rememberPickedAssetUrl(asset: AssetItem, url: string) {
  if (asset.assetType === 'IMAGE' || asset.assetType === 'COVER') {
    quickPickedImageUrl.value = url
  } else if (asset.assetType === 'AUDIO') {
    quickPickedAudioUrl.value = url
  } else if (asset.assetType === 'VIDEO') {
    quickPickedVideoUrl.value = url
  } else if (asset.assetType === 'JSON') {
    if (isCarModelBundleAsset(asset)) {
      quickPickedCarBundleUrl.value = url
    } else {
      quickPickedJsonUrl.value = url
    }
  } else if (asset.assetType === 'TEXT') {
    quickPickedTextUrl.value = url
  }
}

function removeMaterial(assetId: number) {
  materials.value = materials.value.filter((item) => item.asset.assetId !== assetId)
}

function roleLabel(role: QuickRenderAssetRole | string) {
  return roleOptions.find((item) => item.value === role)?.label || '自动素材'
}

async function ensureNarrationReadyForSubmit() {
  const source = narrationSourceText.value.trim()
  if (!source) {
    return ''
  }
  if (!needsNarrationLocalization.value) {
    if (!finalNarrationText.value.trim() || narrationResolvedKey.value !== narrationLocalizationKey.value) {
      finalNarrationText.value = source
      narrationResolvedKey.value = narrationLocalizationKey.value
      narrationEdited.value = false
    }
    return finalNarrationText.value.trim()
  }
  try {
    return await localizeNarrationCopy(false)
  } catch {
    errorMessage.value = narrationError.value || '讲述文案生成失败'
    return null
  }
}

function regenerateNarrationLocalization() {
  narrationEdited.value = false
  void localizeNarrationCopy(true).catch(() => undefined)
}

function refreshNarrationEditorForCurrentSource() {
  stopNarrationTracking?.()
  stopNarrationTracking = null
  narrationLocalizationPromise = null
  narrationTaskProgress.value = null
  narrationError.value = ''
  narrationLocalizationLoading.value = false
  const source = narrationSourceText.value.trim()
  if (!source) {
    finalNarrationText.value = ''
    narrationResolvedKey.value = ''
    narrationEdited.value = false
    return
  }
  if (!needsNarrationLocalization.value) {
    finalNarrationText.value = source
    narrationResolvedKey.value = narrationLocalizationKey.value
    narrationEdited.value = false
    return
  }
  finalNarrationText.value = ''
  narrationResolvedKey.value = ''
  narrationEdited.value = false
  void localizeNarrationCopy(false).catch(() => undefined)
}

async function localizeNarrationCopy(force: boolean) {
  const source = narrationSourceText.value.trim()
  const key = narrationLocalizationKey.value
  if (!source) {
    return ''
  }
  if (!needsNarrationLocalization.value) {
    finalNarrationText.value = source
    narrationResolvedKey.value = key
    narrationEdited.value = false
    return source
  }
  if (!force && finalNarrationText.value.trim() && narrationResolvedKey.value === key) {
    return finalNarrationText.value.trim()
  }
  if (!force && narrationLocalizationPromise) {
    return narrationLocalizationPromise
  }

  stopNarrationTracking?.()
  stopNarrationTracking = null
  narrationError.value = ''
  narrationLocalizationLoading.value = true
  narrationTaskProgress.value = 0

  const promise = (async () => {
    const task = await rewriteDouyinCopywriting({
      originalText: source,
      style: narrationRewriteStyle(voiceLanguage.value),
      introduce: narrationRewriteInstruction(voiceLanguage.value),
    })
    narrationTaskProgress.value = task.progress ?? 0
    if (!task.taskId) {
      throw new Error('文案生成任务未返回 taskId')
    }
    return await new Promise<string>((resolve, reject) => {
      stopNarrationTracking = trackTaskResult<DouyinRewriteWriterVO>(task.taskId, {
        onStatus(message) {
          narrationTaskProgress.value = message.progress
        },
        onResult(taskResult) {
          const text = normalizeNarrationText(taskResult.result?.translatedText || '')
          if (!text) {
            const error = new Error('豆包返回的讲述文案为空')
            narrationError.value = error.message
            reject(error)
            return
          }
          finalNarrationText.value = text
          narrationResolvedKey.value = key
          narrationEdited.value = false
          narrationTaskProgress.value = taskResult.progress ?? 100
          stopNarrationTracking = null
          resolve(text)
        },
        onFailure(message) {
          const error = new Error(message.errorMessage || '讲述文案生成失败')
          narrationTaskProgress.value = message.progress
          narrationError.value = error.message
          stopNarrationTracking = null
          reject(error)
        },
        onError(error) {
          narrationError.value = error.message
          stopNarrationTracking = null
          reject(error)
        },
      })
    })
  })()

  narrationLocalizationPromise = promise
  try {
    return await promise
  } catch (error) {
    narrationError.value = error instanceof Error ? error.message : '讲述文案生成失败'
    throw error
  } finally {
    narrationLocalizationLoading.value = false
    narrationLocalizationPromise = null
  }
}

async function submitQuickRender() {
  if (!canSubmit.value || busy.value) return
  errorMessage.value = ''
  result.value = null
  taskStatus.value = ''
  taskProgress.value = null
  const finalNarration = await ensureNarrationReadyForSubmit()
  if (finalNarration == null) {
    return
  }
  busy.value = true
  stopRenderTracking()

  const payload: QuickRenderRequest = {
    intent: 'auto',
    assetIds: materials.value.map((item) => item.asset.assetId),
    assetRoles: Object.fromEntries(materials.value.map((item) => [String(item.asset.assetId), item.role])),
    assetTextContents: Object.fromEntries(
      materials.value
        .filter((item) => item.textContent && item.textContent.trim())
        .map((item) => [String(item.asset.assetId), item.textContent || '']),
    ),
    aspectRatio: aspectRatio.value,
    subtitleMode: subtitleMode.value,
    subtitleLanguage: subtitleLanguage.value,
    nativeVoiceLanguage: voiceLanguage.value,
    burnInSubtitle: subtitleMode.value !== 'off',
    customSubtitle: subtitleMode.value === 'upload' ? uploadedSubtitleText.value || undefined : undefined,
    finalVoiceText: finalNarration || undefined,
    strictVoiceText: Boolean(finalNarration),
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
  stopRenderTracking()
  stopNarrationTracking?.()
  stopNarrationTracking = null
}

function stopRenderTracking() {
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

function inferRole(file: QuickFileLike, asset: AssetItem): QuickRenderAssetRole {
  const metadata = parseQuickAssetMetadata(asset.metadataJson)
  const explicitRole = normalizeQuickAssetRole(
    quickMetadataText(metadata, 'assetRole') || quickMetadataText(metadata, 'role'),
  )
  if (explicitRole) {
    return explicitRole
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const metadataSource = quickMetadataText(metadata, 'source').toUpperCase()
  if (
    asset.assetType === 'JSON' &&
    ['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'].includes(sourceType)
  ) {
    return 'benchmark_json'
  }
  if (
    asset.assetType === 'JSON' &&
    ['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'].includes(sourceType)
  ) {
    return 'storyboard_json'
  }
  if (asset.assetType === 'AUDIO' && ['TTS_GENERATE', 'VOICE_SAMPLE'].includes(sourceType)) {
    return 'voiceover'
  }
  if (asset.assetType === 'VIDEO' && sourceType === 'DIGITAL_HUMAN_GENERATE') {
    return 'host_video'
  }
  if (
    asset.assetType === 'IMAGE' &&
    (sourceType === 'AVATAR_GENERATE' || metadataSource === 'DOUBAO_SEEDREAM' || quickMetadataText(metadata, 'avatarName'))
  ) {
    return 'host_image'
  }
  const name = [
    file.name,
    asset.fileName,
    quickMetadataText(metadata, 'originalFileName'),
    quickMetadataText(metadata, 'title'),
    quickMetadataText(metadata, 'sourceTitle'),
  ].filter(Boolean).join(' ')
  if (isCarModelBundleAsset(asset) || name.includes('车型素材包') || name.toLowerCase().includes('car_model_bundle')) {
    return 'car_model_bundle'
  }
  const mime = file.type || asset.mimeType || ''
  return inferRoleFromNameAndMime(name, mime)
}

function inferUploadedAssetRoleForMetadata(file: File): QuickRenderAssetRole | '' {
  const role = inferRoleFromNameAndMime(file.name, file.type)
  if (role === 'material') {
    return ''
  }
  if (role === 'scene_outdoor' && !hasExplicitOutdoorImageSignal(file.name)) {
    return ''
  }
  return role
}

function inferRoleFromNameAndMime(nameText: string, mimeText: string | null | undefined): QuickRenderAssetRole {
  const name = nameText.toLowerCase()
  const mime = String(mimeText || '').toLowerCase()
  if (name.includes('车型素材包') || name.includes('car_model_bundle')) {
    return 'car_model_bundle'
  }
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

function hasExplicitOutdoorImageSignal(nameText: string) {
  const name = nameText.toLowerCase()
  return ['outdoor', 'city', '户外', '城市', '街景', '外景'].some((token) => name.includes(token))
}

function parseQuickAssetMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function quickMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeQuickAssetRole(role: string | null | undefined): QuickRenderAssetRole | '' {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases: Record<string, QuickRenderAssetRole> = {
    voice: 'voiceover',
    voice_over: 'voiceover',
    tts: 'voiceover',
    music: 'bgm',
    background_music: 'bgm',
    storyboard: 'storyboard_json',
    benchmark: 'benchmark_json',
    script: 'voice_script',
    subtitle_text: 'subtitle',
    car_bundle: 'car_model_bundle',
    model_bundle: 'car_model_bundle',
    host: 'host_image',
    avatar: 'host_image',
    host_video_asset: 'host_video',
    reference: 'reference_video',
  }
  const roleValue = aliases[normalized] || normalized
  return roleOptions.some((option) => option.value === roleValue)
    ? roleValue as QuickRenderAssetRole
    : ''
}

function isCarModelBundleAsset(asset: AssetItem) {
  const meta = (asset.metadataJson || '').toLowerCase()
  const name = (asset.fileName || '').toLowerCase()
  return meta.includes('car_model_bundle') || (meta.includes('car_model') && meta.includes('bundle')) ||
    name.includes('车型素材包') || name.includes('car-model-bundle') || name.includes('car_model_bundle')
}

function shouldReadText(asset: AssetItem, file: QuickFileLike) {
  const mime = (file.type || asset.mimeType || '').toLowerCase()
  const name = (file.name || asset.fileName || '').toLowerCase()
  return mime.startsWith('text/') || mime.includes('json') || name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.srt')
}

async function readTextContent(asset: AssetItem) {
  const text = await getAssetTextContent(asset)
  return text.length > 20000 ? text.slice(0, 20000) : text
}

function extractNarrationSourceText(items: QuickMaterial[]) {
  const preferredRoles: QuickRenderAssetRole[] = ['voice_script', 'subtitle', 'benchmark_json', 'storyboard_json']
  for (const role of preferredRoles) {
    for (const item of items) {
      if (item.role !== role || !item.textContent?.trim()) {
        continue
      }
      const text = role === 'voice_script' || role === 'subtitle'
        ? normalizeNarrationText(item.textContent)
        : extractNarrationFromJsonText(item.textContent)
      if (text) {
        return text
      }
    }
  }
  return ''
}

function extractNarrationFromJsonText(value: string) {
  const raw = value.trim()
  if (!raw) {
    return ''
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    const direct = firstJsonText(parsed, [
      ['rewriteResult', 'translatedText'],
      ['transcriptResult', 'translatedText'],
      ['transcriptResult', 'originalText'],
      ['translatedText'],
      ['rewrittenText'],
      ['finalScript'],
      ['finalVoiceText'],
      ['sourceScript'],
      ['originalText'],
    ])
    if (direct) {
      return normalizeNarrationText(direct)
    }
    const collected: string[] = []
    collectJsonNarrationText(parsed, collected)
    return normalizeNarrationText(collected.slice(0, 8).join('\n'))
  } catch {
    return normalizeNarrationText(raw)
  }
}

function firstJsonText(value: unknown, paths: string[][]) {
  for (const path of paths) {
    let cursor = value as unknown
    for (const key of path) {
      if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
        cursor = undefined
        break
      }
      cursor = (cursor as Record<string, unknown>)[key]
    }
    if (typeof cursor === 'string' && cursor.trim()) {
      return cursor.trim()
    }
  }
  return ''
}

function collectJsonNarrationText(value: unknown, output: string[]) {
  if (!value || output.length >= 12) {
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonNarrationText(item, output)
    }
    return
  }
  if (typeof value !== 'object') {
    return
  }
  const preferredKeys = new Set(['voiceText', 'content', 'narration', 'script', 'text', 'copywriting'])
  const record = value as Record<string, unknown>
  for (const [key, child] of Object.entries(record)) {
    if (preferredKeys.has(key) && typeof child === 'string' && child.trim() && child.trim() !== '无') {
      output.push(child.trim())
    }
  }
  for (const child of Object.values(record)) {
    collectJsonNarrationText(child, output)
  }
}

function normalizeNarrationText(value: string) {
  const withoutSrt = value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/.test(line) && !/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s+-->/i.test(line))
    .join('\n')
  const normalized = withoutSrt
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return normalized.length > 3000 ? normalized.slice(0, 3000).trim() : normalized
}

function narrationLanguageMismatch(text: string, targetLanguage: string) {
  const clean = normalizeNarrationText(text)
  if (!clean) {
    return false
  }
  const stats = narrationLanguageStats(clean)
  if (targetLanguage === 'en-US') {
    return stats.cjk > 0
  }
  if (stats.cjk === 0) {
    return stats.latin >= 4
  }
  return stats.latin >= 12 && stats.latin > stats.cjk * 2
}

function narrationLanguageStats(text: string) {
  let cjk = 0
  let latin = 0
  for (const char of text) {
    if (/[\u4E00-\u9FFF]/.test(char)) {
      cjk += 1
    } else if (/[A-Za-z]/.test(char)) {
      latin += 1
    }
  }
  return { cjk, latin }
}

function stableTextKey(text: string) {
  const normalized = normalizeNarrationText(text)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0
  }
  return `${normalized.length}:${hash}`
}

function narrationRewriteStyle(language: string) {
  return language === 'en-US' ? '自然英语口播翻译' : '自然中文口播翻译'
}

function narrationRewriteInstruction(language: string) {
  if (language === 'en-US') {
    return '将原文改写式翻译成自然、简洁、可直接讲述的英文口播。保留品牌、车型、价格、数字和单位，不添加不存在的卖点，不要生硬直译，只输出英文文案。'
  }
  return '将原文改写式翻译成自然、简洁、可直接讲述的中文普通话口播。保留品牌、车型、价格、数字和单位，不添加不存在的卖点，不要生硬直译，只输出中文文案。'
}

function formatSize(size: number | null | undefined) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

watch([narrationSourceText, voiceLanguage], () => refreshNarrationEditorForCurrentSource())

onBeforeUnmount(stopAllTracking)
</script>

<style scoped>
.quick-render-page {
  display: grid;
  gap: 16px;
}

.quick-render-page--embedded {
  gap: 14px;
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

.quick-source-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.2fr) repeat(2, minmax(220px, 1fr));
  gap: 12px;
  align-items: stretch;
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
  grid-template-columns: minmax(0, 1fr) 150px 64px;
  gap: 12px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.quick-material-role {
  display: grid;
  gap: 2px;
  justify-items: start;
  border-radius: 8px;
  background: #f6f4ff;
  padding: 8px 10px;
}

.quick-material-role strong {
  color: #5e50df;
  font-size: 12.5px;
  font-weight: 850;
}

.quick-material-role small {
  color: #98a2b3;
  font-size: 11px;
  font-weight: 750;
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

.quick-grid-compact {
  grid-template-columns: repeat(auto-fit, minmax(220px, 320px));
}

.quick-smart-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-smart-grid > div {
  display: grid;
  gap: 6px;
  min-height: 92px;
  align-content: start;
  border: 1px solid #e8ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 14px;
}

.quick-smart-grid span {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 850;
}

.quick-smart-grid strong {
  color: #1f2540;
  font-size: 15px;
  font-weight: 900;
}

.quick-smart-grid small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
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

.quick-narration-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.quick-narration-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quick-narration-head > div {
  display: grid;
  gap: 4px;
}

.quick-narration-head label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 850;
}

.quick-narration-head small {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.quick-narration-head button {
  height: 34px;
  border: 1px solid #d9ddff;
  border-radius: 8px;
  background: #fff;
  color: #5e50df;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 850;
  padding: 0 12px;
}

.quick-narration-head button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.quick-narration-panel textarea {
  width: 100%;
  min-height: 132px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
}

.quick-progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  color: #5e50df;
  font-size: 12px;
  font-weight: 850;
}

.quick-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #e9ecf5;
}

.quick-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #635bff;
  transition: width 0.2s ease;
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
  .quick-smart-grid,
  .quick-source-grid,
  .quick-summary dl {
    grid-template-columns: 1fr 1fr;
  }

  .quick-material {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .quick-grid,
  .quick-smart-grid,
  .quick-source-grid,
  .quick-summary dl {
    grid-template-columns: 1fr;
  }
}
</style>

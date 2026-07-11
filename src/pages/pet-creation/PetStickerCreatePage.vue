<template>
  <section class="pet-sticker-page">
    <header class="pet-sticker-head">
      <div>
        <span>宠物创作中心</span>
        <h2>宠物表情包</h2>
        <p>已整合“照片动起来”：上传宠物照片并描述动作，可选择生成 GIF 动图或 MP4 短视频。</p>
      </div>
      <div class="pet-sticker-head-meta">
        <strong>{{ modeLabel }}</strong>
        <small>1:1 · {{ selectedStyleLabel }}</small>
      </div>
    </header>

    <div class="pet-sticker-layout">
      <section class="pet-sticker-panel pet-sticker-composer">
        <div class="pet-sticker-mode" aria-label="表情包类型">
          <button type="button" :class="{ active: stickerMode === 'static' }" @click="stickerMode = 'static'">
            静态图片（保留）
            <small>PNG/JPG</small>
          </button>
          <button type="button" :class="{ active: stickerMode === 'dynamic' }" @click="stickerMode = 'dynamic'">
            动态表情
            <small>GIF / MP4</small>
          </button>
        </div>

        <label class="pet-sticker-prompt">
          一句话描述
          <input
            v-model.trim="stickerPrompt"
            maxlength="80"
            placeholder="例如：小猫开心跳舞、小狗做鬼脸、小猫生气跺脚"
            @blur="syncStickerDraft"
          />
        </label>

        <div class="pet-sticker-reference">
          <div class="pet-sticker-section-head">
            <div>
              <h3>宠物照片</h3>
              <span>{{ selectedReferenceLabel }}</span>
            </div>
            <div class="pet-sticker-reference-actions">
              <button type="button" @click="referenceOpen = !referenceOpen">
                {{ referenceOpen ? '收起素材' : '选择/更换素材' }}
              </button>
              <button type="button" :disabled="uploading" @click="openUpload">
                {{ uploading ? '上传中...' : '上传图片' }}
              </button>
            </div>
            <input
              ref="uploadInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="handleUploadChange"
            />
          </div>

          <div v-if="referenceOpen" class="pet-sticker-reference-grid">
            <button
              v-for="asset in referenceAssets"
              :key="asset.assetId"
              type="button"
              class="pet-sticker-reference-card"
              :class="{ active: selectedReferenceAssetId === asset.assetId }"
              @click="selectReferenceAsset(asset)"
            >
              <img :src="assetUrl(asset.thumbnailUrl || asset.fileUrl)" :alt="asset.fileName" />
              <span>{{ asset.fileName }}</span>
            </button>
            <button v-if="referenceAssets.length === 0" type="button" class="pet-sticker-reference-empty" @click="openUpload">
              上传一张宠物照片
            </button>
          </div>
        </div>

        <div class="pet-sticker-section">
          <div class="pet-sticker-section-head">
            <div>
              <h3>表情</h3>
              <span>{{ selectedExpression.label }}</span>
            </div>
          </div>
          <div class="pet-sticker-chip-row">
            <button
              v-for="expression in expressionOptions"
              :key="expression.value"
              type="button"
              :class="{ active: stickerExpression === expression.value }"
              @click="stickerExpression = expression.value"
            >
              {{ expression.label }}
            </button>
          </div>
        </div>

        <div class="pet-sticker-section">
          <div class="pet-sticker-section-head">
            <div>
              <h3>图片编辑</h3>
              <span>{{ editSummary }}</span>
            </div>
          </div>
          <div class="pet-sticker-edit-grid">
            <label>
              <input v-model="editOptions.removeBackground" type="checkbox" />
              背景移除
            </label>
            <label>
              <input v-model="editOptions.whiteOutline" type="checkbox" />
              白色描边
            </label>
            <label>
              <input v-model="editOptions.transparentBackground" type="checkbox" />
              透明底
            </label>
            <label>
              <input v-model="editOptions.expressionBoost" type="checkbox" />
              表情强化
            </label>
          </div>
        </div>

        <div class="pet-sticker-section pet-sticker-text-editor">
          <div class="pet-sticker-section-head">
            <div>
              <h3>文字与图标</h3>
              <span>{{ overlaySummary }}</span>
            </div>
            <button type="button" @click="resetOverlayPosition">居中</button>
          </div>

          <label class="pet-sticker-caption">
            <input v-model="captionEnabled" type="checkbox" />
            加文字
            <input
              v-model.trim="captionText"
              maxlength="16"
              :disabled="!captionEnabled"
              placeholder="例如：糟糕，被发现了"
            />
          </label>

          <div class="pet-sticker-style-grid">
            <label>
              字体
              <select v-model="captionStyle.fontFamily" :disabled="!captionEnabled">
                <option value="Microsoft YaHei">微软雅黑</option>
                <option value="Arial Black">粗黑体</option>
                <option value="KaiTi">手写感</option>
              </select>
            </label>
            <label>
              描边
              <select v-model="captionStyle.strokeMode" :disabled="!captionEnabled">
                <option value="strong">强描边</option>
                <option value="thin">轻描边</option>
                <option value="none">无描边</option>
              </select>
            </label>
            <label>
              字号
              <input v-model.number="captionStyle.fontSize" type="range" min="18" max="44" :disabled="!captionEnabled" />
            </label>
            <label>
              X/Y 位置
              <span class="pet-sticker-position-value">{{ Math.round(captionStyle.x) }} / {{ Math.round(captionStyle.y) }}</span>
            </label>
          </div>

          <div class="pet-sticker-color-row" aria-label="文字颜色">
            <button
              v-for="color in captionColors"
              :key="color.value"
              type="button"
              :class="{ active: captionStyle.textColor === color.value }"
              :style="{ '--swatch': color.value }"
              :disabled="!captionEnabled"
              :title="color.label"
              @click="captionStyle.textColor = color.value"
            />
          </div>

          <div class="pet-sticker-icon-row" aria-label="图标选择">
            <button
              v-for="icon in iconOptions"
              :key="icon.value"
              type="button"
              :class="{ active: selectedIcon === icon.value }"
              @click="selectedIcon = icon.value"
            >
              <span>{{ icon.symbol }}</span>
              {{ icon.label }}
            </button>
          </div>

          <div class="pet-sticker-position-grid">
            <label>
              文字 X
              <input v-model.number="captionStyle.x" type="range" min="8" max="92" :disabled="!captionEnabled" />
            </label>
            <label>
              文字 Y
              <input v-model.number="captionStyle.y" type="range" min="8" max="92" :disabled="!captionEnabled" />
            </label>
            <label>
              图标 X
              <input v-model.number="iconStyle.x" type="range" min="8" max="92" :disabled="selectedIcon === 'none'" />
            </label>
            <label>
              图标 Y
              <input v-model.number="iconStyle.y" type="range" min="8" max="92" :disabled="selectedIcon === 'none'" />
            </label>
          </div>
        </div>

        <div class="pet-sticker-param-grid">
          <label>
            风格
            <select v-model="selectedStyle">
              <option value="funny">搞笑</option>
              <option value="cute">可爱</option>
              <option value="healing">治愈</option>
              <option value="realistic">写实</option>
              <option value="anime">动漫</option>
              <option value="anthropomorphic">轻拟人</option>
            </select>
          </label>
          <label v-if="stickerMode === 'static'">
            数量
            <select v-model.number="staticCount">
              <option :value="1">1 张</option>
              <option :value="2">2 张</option>
              <option :value="4">4 张</option>
            </select>
          </label>
          <label v-if="stickerMode === 'static'">
            输出
            <select v-model="staticFormat">
              <option value="png">透明 PNG</option>
              <option value="jpg">社交 JPG</option>
            </select>
          </label>
          <label v-else>
            时长
            <input
              v-model.number="dynamicDuration"
              type="number"
              :min="PET_MIN_VIDEO_DURATION_SECONDS"
              :max="PET_MAX_VIDEO_DURATION_SECONDS"
              step="1"
              @blur="normalizeDynamicDuration"
              @change="normalizeDynamicDuration"
            />
          </label>
          <label v-if="stickerMode === 'dynamic'">
            输出
            <select v-model="dynamicFormat">
              <option value="gif">GIF 动图预设</option>
              <option value="mp4">MP4 短视频</option>
            </select>
          </label>
          <label class="pet-sticker-param-wide">
            风格描述
            <input
              v-model.trim="stylePromptText"
              maxlength="160"
              placeholder="例如：聊天表情包、白色描边、干净可转发、轻微夸张"
              @blur="syncStickerDraft"
            />
          </label>
        </div>

        <BillingEstimateBanner
          v-if="stickerMode === 'static'"
          :estimated-credit-cost="staticImageEstimate.estimatedCreditCost.value"
          :balance="staticImageEstimate.balance.value"
          :loading="staticImageEstimate.loading.value"
          :steps="staticImageEstimate.steps.value"
        />

        <div class="pet-sticker-actions">
          <button type="button" :disabled="submitting || creating || !canSubmitSticker" @click="handleGenerateSticker">
            {{ primaryActionText }}
          </button>
          <button type="button" :disabled="submitting || creating" @click="goPetAssets">宠物资产</button>
        </div>
        <p v-if="errorMessage" class="pet-sticker-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="pet-sticker-success">{{ successMessage }}</p>
      </section>

      <aside class="pet-sticker-panel pet-sticker-preview">
        <div class="pet-sticker-section-head">
          <div>
            <h3>预览</h3>
            <span>{{ previewHint }}</span>
          </div>
        </div>
        <div
          ref="previewStageRef"
          class="pet-sticker-preview-stage"
          @pointermove="handlePreviewPointerMove"
          @pointerup="stopPreviewDrag"
          @pointerleave="stopPreviewDrag"
        >
          <img v-if="selectedReferenceAsset" :src="assetUrl(selectedReferenceAsset.thumbnailUrl || selectedReferenceAsset.fileUrl)" alt="宠物参考图" />
          <div v-else class="pet-sticker-preview-empty">未选择宠物照片</div>
          <strong
            v-if="captionEnabled && captionText"
            class="pet-sticker-overlay-text"
            :style="captionOverlayStyle"
            @pointerdown.stop.prevent="startPreviewDrag('text', $event)"
          >
            {{ captionText }}
          </strong>
          <span
            v-if="selectedIconMeta"
            class="pet-sticker-overlay-icon"
            :style="iconOverlayStyle"
            @pointerdown.stop.prevent="startPreviewDrag('icon', $event)"
          >
            {{ selectedIconMeta.symbol }}
          </span>
        </div>
        <div class="pet-sticker-result-grid">
          <article v-for="asset in generatedAssets" :key="asset.assetId" class="pet-sticker-result-card">
            <img :src="assetUrl(asset.thumbnailUrl || asset.fileUrl)" :alt="asset.fileName" />
            <span>{{ asset.fileName }}</span>
          </article>
        </div>
      </aside>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import {
  createPetVideoTask,
  estimatePetVideoCost,
  getPetCreationApiMode,
  previewPetVideoTask,
} from '../../services/petCreationApi'
import { API_ORIGIN } from '../../services/request'
import { getAssets, uploadMaterialAsset } from '../../services/assetApi'
import { generatePetImageAsset } from '../../services/petAssetToolApi'
import { usePetCreationState } from './usePetCreationState'
import { findPetTemplate } from './petTemplateConfig'
import {
  PET_MAX_VIDEO_DURATION_SECONDS,
  PET_MIN_VIDEO_DURATION_SECONDS,
  normalizePetVideoDurationSeconds,
  petErrorMessage,
  promptRequiredMessage,
  validatePetCreationDraft,
  validStoryboardShots,
} from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'
import type {
  PetCreationStyle,
  PetReferenceMaterial,
  PetStoryboardShot,
  PetTextStrokeMode,
  PetVideoEstimate,
  PetVideoPreview,
} from './petCreationTypes'
import type { AssetItem } from '../../types/assetTypes'

type StickerMode = 'static' | 'dynamic'
type DragTarget = 'text' | 'icon'
type StaticStickerFormat = 'png' | 'jpg'
type DynamicStickerFormat = 'gif' | 'mp4'

const route = useRoute()
const router = useRouter()
const { draft, applyTemplate, loadDraft, saveDraft, snapshotDraft } = usePetCreationState()
const apiMode = getPetCreationApiMode()

const stickerMode = ref<StickerMode>('dynamic')
const stickerPrompt = ref('')
const stickerExpression = ref('cute')
const selectedStyle = ref<PetCreationStyle>('funny')
const stylePromptText = ref('')
const staticCount = ref(4)
const staticFormat = ref<StaticStickerFormat>('png')
const dynamicDuration = ref(5)
const dynamicFormat = ref<DynamicStickerFormat>('gif')
const captionEnabled = ref(false)
const captionText = ref('')
const selectedIcon = ref('none')
const referenceAssets = ref<AssetItem[]>([])
const generatedAssets = ref<AssetItem[]>([])
const selectedReferenceAssetId = ref<number | null>(null)
const referenceOpen = ref(false)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const previewStageRef = ref<HTMLElement | null>(null)
const uploading = ref(false)
const loadingAssets = ref(false)
const submitting = ref(false)
const creating = ref(false)
const previewing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const planOpen = ref(false)
const planEstimate = ref<PetVideoEstimate | null>(null)
const planPreview = ref<PetVideoPreview | null>(null)
const dragTarget = ref<DragTarget | null>(null)

const captionStyle = reactive({
  fontFamily: 'Microsoft YaHei',
  fontSize: 30,
  textColor: '#ffffff',
  outlineColor: '#111827',
  strokeMode: 'strong' as PetTextStrokeMode,
  x: 50,
  y: 82,
})

const iconStyle = reactive({
  x: 82,
  y: 22,
  size: 30,
  color: '#2563eb',
})

const editOptions = reactive({
  removeBackground: true,
  whiteOutline: true,
  transparentBackground: true,
  expressionBoost: true,
})

const staticImageEstimate = useBillingEstimate({
  taskType: 'PET_IMAGE_GENERATE',
  watchKeys: () => [stickerMode.value, staticCount.value, staticFormat.value],
  buildRequest: () => stickerMode.value === 'static' ? { imageCount: staticCount.value } : null,
})

const expressionOptions = [
  { value: 'cute', label: '可爱', prompt: '圆眼睛，可爱卖萌' },
  { value: 'wronged', label: '委屈', prompt: '委屈巴巴，眼神无辜' },
  { value: 'shock', label: '震惊', prompt: '震惊瞪眼，反应夸张' },
  { value: 'speechless', label: '无语', prompt: '无语斜眼，表情好笑' },
  { value: 'proud', label: '得意', prompt: '得意抬头，小表情骄傲' },
  { value: 'sleepy', label: '困困', prompt: '困到眯眼，软萌慵懒' },
]

const styleLabels: Record<PetCreationStyle, string> = {
  realistic: '写实',
  cute: '可爱',
  anime: '动漫',
  anthropomorphic: '拟人',
  funny: '搞笑',
  healing: '治愈',
}

const captionColors = [
  { value: '#ffffff', label: '白色' },
  { value: '#111827', label: '黑色' },
  { value: '#2563eb', label: '蓝色' },
  { value: '#ef4444', label: '红色' },
  { value: '#f59e0b', label: '黄色' },
  { value: '#16a34a', label: '绿色' },
]

const iconOptions = [
  { value: 'none', label: '无图标', symbol: '' },
  { value: 'bang', label: '惊叹', symbol: '!' },
  { value: 'question', label: '疑问', symbol: '?' },
  { value: 'heart', label: '喜欢', symbol: '♥' },
  { value: 'spark', label: '闪光', symbol: '✦' },
  { value: 'sweat', label: '紧张', symbol: '…' },
]

const selectedExpression = computed(() => expressionOptions.find((item) => item.value === stickerExpression.value) || expressionOptions[0])
const selectedStyleLabel = computed(() => styleLabels[selectedStyle.value] || selectedStyle.value)
const modeLabel = computed(() => stickerMode.value === 'static' ? '静态表情包' : `${dynamicFormat.value.toUpperCase()} 动态表情`)
const selectedIconMeta = computed(() => iconOptions.find((item) => item.value === selectedIcon.value && item.value !== 'none') || null)
const selectedReferenceAsset = computed(() => {
  if (selectedReferenceAssetId.value == null) return null
  return referenceAssets.value.find((asset) => asset.assetId === selectedReferenceAssetId.value) || null
})
const selectedReferenceLabel = computed(() => selectedReferenceAsset.value?.fileName || '可直接上传或选择已有宠物图片')
const canSubmitSticker = computed(() => Boolean(stickerPrompt.value.trim() && selectedReferenceAssetId.value))
const primaryActionText = computed(() => {
  if (submitting.value || creating.value) return '生成中...'
  return stickerMode.value === 'static' ? '生成静态表情包' : `生成 ${dynamicFormat.value.toUpperCase()} 动态表情`
})
const previewHint = computed(() => {
  if (stickerMode.value === 'static') return `${staticCount.value} 张 · ${staticFormat.value.toUpperCase()} · ${editSummary.value}`
  return `${dynamicDuration.value} 秒循环 · ${dynamicFormat.value.toUpperCase()} 预设 · ${editSummary.value}`
})
const editSummary = computed(() => {
  const items = []
  if (editOptions.removeBackground) items.push('抠背景')
  if (editOptions.whiteOutline) items.push('描边')
  if (editOptions.transparentBackground && staticFormat.value === 'png') items.push('透明底')
  if (captionEnabled.value) items.push('加字')
  if (selectedIcon.value !== 'none') items.push('图标')
  return items.join(' / ') || '原图增强'
})
const overlaySummary = computed(() => {
  const text = captionEnabled.value && captionText.value ? `文字 ${captionText.value}` : '不加文字'
  const icon = selectedIconMeta.value ? `图标 ${selectedIconMeta.value.label}` : '无图标'
  return `${text} / ${icon}`
})
const captionOverlayStyle = computed(() => ({
  left: `${captionStyle.x}%`,
  top: `${captionStyle.y}%`,
  color: captionStyle.textColor,
  fontFamily: captionStyle.fontFamily,
  fontSize: `${captionStyle.fontSize}px`,
  textShadow: strokeShadow(captionStyle.strokeMode, captionStyle.outlineColor),
}))
const iconOverlayStyle = computed(() => ({
  left: `${iconStyle.x}%`,
  top: `${iconStyle.y}%`,
  color: iconStyle.color,
  fontSize: `${iconStyle.size}px`,
}))

usePetApiFallbackNotice()

watch(stickerPrompt, (value) => {
  draft.prompt = value
})

watch(selectedStyle, (value) => {
  draft.style = value
})

watch(stylePromptText, (value) => {
  draft.visualSettings.stylePrompt = value
})

onMounted(async () => {
  try {
    await loadDraft()
    await applyStickerTemplate()
    hydrateFromDraft()
    await loadReferenceAssets()
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '宠物表情包模板加载失败，请稍后重试。')
  }
})

async function applyStickerTemplate() {
  const template = findPetTemplate(String(route.query.templateId || 'pet-sticker'))
  if (template && draft.templateId !== template.id) {
    applyTemplate(template)
    await saveDraft()
  }
}

function hydrateFromDraft() {
  stickerPrompt.value = draft.scriptText || draft.prompt || '宠物做一个适合聊天发送的可爱表情'
  selectedStyle.value = draft.style || 'funny'
  dynamicDuration.value = normalizePetVideoDurationSeconds(draft.durationSeconds || 5, 5)
  stylePromptText.value = draft.visualSettings.stylePrompt || stylePrompt()
  captionEnabled.value = Boolean(draft.subtitleEnabled && firstShotSubtitle())
  captionText.value = firstShotSubtitle()
  captionStyle.fontFamily = draft.subtitleStyle?.fontFamily || captionStyle.fontFamily
  captionStyle.fontSize = draft.subtitleStyle?.fontSize || captionStyle.fontSize
  captionStyle.textColor = draft.subtitleStyle?.textColor || captionStyle.textColor
  captionStyle.outlineColor = draft.subtitleStyle?.outlineColor || captionStyle.outlineColor
  captionStyle.strokeMode = draft.subtitleStyle?.strokeMode || captionStyle.strokeMode
  const overlay = draft.visualSettings.stickerOverlay
  if (overlay) {
    captionStyle.x = clampPercent(overlay.textX, captionStyle.x)
    captionStyle.y = clampPercent(overlay.textY, captionStyle.y)
    iconStyle.x = clampPercent(overlay.iconX, iconStyle.x)
    iconStyle.y = clampPercent(overlay.iconY, iconStyle.y)
    selectedIcon.value = overlay.icon || 'none'
    staticFormat.value = overlay.staticFormat === 'jpg' ? 'jpg' : 'png'
    dynamicFormat.value = overlay.dynamicFormat === 'mp4' ? 'mp4' : 'gif'
  }
  const mainAssetId = Number(draft.materials.find((item) => item.role === 'main_pet')?.assetId || 0)
  selectedReferenceAssetId.value = Number.isFinite(mainAssetId) && mainAssetId > 0 ? mainAssetId : null
}

async function loadReferenceAssets() {
  loadingAssets.value = true
  try {
    referenceAssets.value = await getAssets({
      assetType: 'IMAGE',
      assetGroup: '主宠物候选',
      businessDomain: 'pet',
      scope: 'all',
      sort: 'createdAtDesc',
      pageSize: 16,
    })
    const selectedIsPetAsset = referenceAssets.value.some((asset) => asset.assetId === selectedReferenceAssetId.value)
    if (!selectedIsPetAsset) {
      selectedReferenceAssetId.value = null
    }
    if (selectedReferenceAssetId.value == null && referenceAssets.value[0]) {
      selectReferenceAsset(referenceAssets.value[0], false)
    }
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '加载宠物图片失败。')
  } finally {
    loadingAssets.value = false
  }
}

function openUpload() {
  if (uploading.value) return
  uploadInputRef.value?.click()
}

async function handleUploadChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请上传 JPG、PNG 或 WebP 图片。')
    return
  }
  uploading.value = true
  errorMessage.value = ''
  try {
    const uploaded = await uploadMaterialAsset(file, {
      businessDomain: 'pet',
      metadataJson: JSON.stringify({
        businessDomain: 'pet',
        domain: 'pet_creation',
        assetGroup: '主宠物候选',
        assetRole: 'main_pet',
        materialRole: 'main_pet',
        role: 'main_pet',
        source: 'pet_sticker_upload',
        usage: 'pet_sticker_reference',
      }),
    })
    referenceAssets.value = [uploaded, ...referenceAssets.value.filter((asset) => asset.assetId !== uploaded.assetId)]
    selectReferenceAsset(uploaded)
    ElMessage.success('宠物照片已添加。')
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '上传宠物图片失败。')
  } finally {
    uploading.value = false
  }
}

function selectReferenceAsset(asset: AssetItem, persist = true) {
  selectedReferenceAssetId.value = asset.assetId
  upsertMainPetMaterial(asset)
  referenceOpen.value = false
  if (persist) void saveDraft()
}

function upsertMainPetMaterial(asset: AssetItem) {
  const material: PetReferenceMaterial = {
    id: `pet-sticker-main-${asset.assetId}`,
    role: 'main_pet',
    assetId: String(asset.assetId),
    url: asset.fileUrl,
    label: asset.fileName || '宠物照片',
  }
  draft.materials = [material, ...draft.materials.filter((item) => item.role !== 'main_pet')]
}

async function handleGenerateSticker() {
  if (!stickerPrompt.value.trim()) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  if (!selectedReferenceAssetId.value) {
    ElMessage.warning('请先选择或上传一张宠物照片。')
    return
  }
  errorMessage.value = ''
  successMessage.value = ''
  syncStickerDraft()
  if (stickerMode.value === 'static') {
    await generateStaticSticker()
    return
  }
  await openDynamicPlanPreview()
}

async function generateStaticSticker() {
  if (staticImageEstimate.insufficientHint.value) {
    ElMessage.warning(staticImageEstimate.insufficientHint.value)
    return
  }
  submitting.value = true
  try {
    await staticImageEstimate.refresh()
    if (staticImageEstimate.insufficientHint.value) {
      ElMessage.warning(staticImageEstimate.insufficientHint.value)
      return
    }
    await saveDraft()
    const result = await generatePetImageAsset({
      kind: 'pet',
      name: captionText.value || stickerPrompt.value.slice(0, 16) || '宠物表情包',
      prompt: buildStickerPrompt('static'),
      style: stylePrompt(),
      imageCount: staticCount.value,
      size: '1K',
      referenceAssetIds: selectedReferenceAssetId.value ? [selectedReferenceAssetId.value] : [],
    })
    generatedAssets.value = result.assets || []
    successMessage.value = `已生成 ${generatedAssets.value.length} 张静态表情并保存到宠物资产中心。`
    await loadReferenceAssets()
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '生成静态表情包失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}

async function openDynamicPlanPreview() {
  planOpen.value = true
  planEstimate.value = null
  planPreview.value = null
  try {
    await saveDraft()
    const currentValidation = validatePetCreationDraft(draft)
    if (currentValidation.blockingIssues[0]) {
      ElMessage.warning(currentValidation.blockingIssues[0].message)
      return
    }
    planEstimate.value = await estimatePetVideoCost(snapshotDraft())
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '动态表情积分预估失败，请稍后重试。')
  }
}

async function runPlanPreview() {
  if (previewing.value || creating.value) return
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
    await saveDraft()
    planPreview.value = await previewPetVideoTask(snapshotDraft())
    if (planPreview.value.providerSubmitEnabled) {
      ElMessage.success('预检通过。继续确认将调用第三方视频生成并可能产生费用。')
      return
    }
    ElMessage.warning('当前为本地安全测试模式，未调用第三方视频生成。')
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '动态表情 dry-run 预检失败，请稍后重试。')
  } finally {
    previewing.value = false
  }
}

async function confirmCreateTask() {
  if (creating.value || previewing.value) return
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
      '将调用第三方视频生成并可能产生费用。本次只生成 1 条动态表情，确认后不可撤销。是否继续？',
      '确认真实生成',
      {
        confirmButtonText: '确认生成',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    creating.value = false
    return
  }
  try {
    await saveDraft()
    const task = await createPetVideoTask(snapshotDraft())
    planOpen.value = false
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    errorMessage.value = petErrorMessage(error, '创建动态表情任务失败，请稍后重试。')
  } finally {
    creating.value = false
  }
}

function normalizeDynamicDuration() {
  dynamicDuration.value = normalizePetVideoDurationSeconds(dynamicDuration.value, 5)
  syncStickerDraft()
}

function syncStickerDraft() {
  draft.templateId = 'pet-sticker'
  draft.videoType = 'sticker'
  draft.generationMode = selectedReferenceAssetId.value ? 'reference_video' : 'text_video'
  draft.prompt = buildStickerPrompt(stickerMode.value)
  draft.scriptText = stickerPrompt.value.trim()
  draft.durationSeconds = stickerMode.value === 'dynamic' ? normalizePetVideoDurationSeconds(dynamicDuration.value, 5) : 5
  draft.aspectRatio = '1:1'
  draft.style = selectedStyle.value
  draft.subtitleEnabled = captionEnabled.value
  draft.subtitleStyle = {
    ...draft.subtitleStyle,
    position: captionStyle.y < 35 ? 'top' : captionStyle.y > 66 ? 'bottom' : 'middle',
    highlighted: captionEnabled.value,
    fontFamily: captionStyle.fontFamily,
    fontSize: captionStyle.fontSize,
    textColor: captionStyle.textColor,
    outlineColor: captionStyle.outlineColor,
    strokeMode: captionStyle.strokeMode,
  }
  draft.voiceEnabled = false
  draft.lipSyncEnabled = false
  draft.bgmEnabled = false
  draft.visualSettings.cameraRhythm = 'fast'
  draft.visualSettings.expressionIntensity = editOptions.expressionBoost ? 96 : 82
  draft.visualSettings.stylePrompt = stylePrompt()
  draft.visualSettings.stickerOverlay = {
    text: captionEnabled.value ? captionText.value.trim() : '',
    textX: Math.round(captionStyle.x),
    textY: Math.round(captionStyle.y),
    icon: selectedIcon.value,
    iconX: Math.round(iconStyle.x),
    iconY: Math.round(iconStyle.y),
    staticFormat: staticFormat.value,
    dynamicFormat: dynamicFormat.value,
  }
  draft.shots = buildStickerShots()
}

function buildStickerPrompt(mode: StickerMode) {
  const base = stickerPrompt.value.trim()
  const captionInstruction = captionEnabled.value && captionText.value
    ? `添加可编辑短字 "${captionText.value}"，字体 ${fontLabel(captionStyle.fontFamily)}，${captionStyle.textColor} 文字，${strokeLabel(captionStyle.strokeMode)}，放在画面 ${Math.round(captionStyle.x)}% / ${Math.round(captionStyle.y)}% 位置`
    : '不添加文字'
  const iconInstruction = selectedIconMeta.value
    ? `添加 ${selectedIconMeta.value.label} 图标 ${selectedIconMeta.value.symbol}，放在画面 ${Math.round(iconStyle.x)}% / ${Math.round(iconStyle.y)}% 位置`
    : '不添加图标'
  const edits = [
    stylePrompt(),
    selectedExpression.value.prompt,
    editOptions.removeBackground ? '主体从背景中干净分离' : '',
    editOptions.whiteOutline ? '贴纸感白色描边' : '',
    editOptions.transparentBackground && staticFormat.value === 'png' ? '透明背景 PNG 风格' : '干净浅色背景',
    captionInstruction,
    iconInstruction,
    mode === 'dynamic'
      ? `${dynamicFormat.value === 'gif' ? 'GIF 动图循环表情预设' : 'MP4 短视频表情预设'}，动作小幅循环，首尾姿态接近`
      : `${staticFormat.value.toUpperCase()} 静态聊天表情包`,
    '不要水印，不要多余文字，不要改变宠物毛色和脸型',
  ].filter(Boolean)
  return `${base}。${edits.join('，')}。`
}

function stylePrompt() {
  if (stylePromptText.value.trim()) return stylePromptText.value.trim().slice(0, 160)
  const styleMap: Record<PetCreationStyle, string> = {
    realistic: '真实宠物照片质感',
    cute: '可爱萌系贴纸风',
    anime: '动漫表情包风格',
    anthropomorphic: '轻拟人宠物贴纸风',
    funny: '搞笑聊天表情包风格',
    healing: '治愈柔和贴纸风格',
  }
  return styleMap[selectedStyle.value] || styleMap.funny
}

function buildStickerShots(): PetStoryboardShot[] {
  const subtitle = captionEnabled.value ? captionText.value : ''
  const total = normalizePetVideoDurationSeconds(dynamicDuration.value, 5)
  const first = Math.max(1, Math.round(total * 0.25))
  const second = Math.max(1, Math.round(total * 0.45))
  const third = Math.max(1, total - first - second)
  const durations = [first, second, third]
  return [
    {
      id: 'sticker-shot-1',
      index: 1,
      durationSeconds: durations[0],
      frameDescription: `1:1 ${dynamicFormat.value === 'gif' ? 'GIF 动图' : '动态表情'}构图，宠物正面或三分之二侧脸居中，背景干净`,
      characterAction: `宠物进入 ${selectedExpression.value.label} 表情，动作轻微自然`,
      cameraMove: '固定近景',
      subtitle,
      voiceEmotion: selectedExpression.value.label,
    },
    {
      id: 'sticker-shot-2',
      index: 2,
      durationSeconds: durations[1],
      frameDescription: '保持同一宠物身份、毛色和脸型，表情略微放大',
      characterAction: editOptions.expressionBoost ? '眼神和嘴部表情增强，适合聊天表情' : '轻微眨眼或点头',
      cameraMove: '轻微推近后稳定',
      subtitle,
      voiceEmotion: selectedExpression.value.label,
    },
    {
      id: 'sticker-shot-3',
      index: 3,
      durationSeconds: durations[2],
      frameDescription: editOptions.whiteOutline ? '保留白色贴纸描边和安全边距，画面可循环' : '保留安全边距，画面可循环',
      characterAction: '动作回到初始姿态，形成自然循环',
      cameraMove: '固定近景',
      subtitle,
      voiceEmotion: selectedExpression.value.label,
    },
  ]
}

function firstShotSubtitle() {
  return validStoryboardShots(draft)[0]?.subtitle || ''
}

function assetUrl(url?: string | null) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function goPetAssets() {
  void router.push({ name: 'pet-assets', query: { category: 'pet' } })
}

function startPreviewDrag(target: DragTarget, event: PointerEvent) {
  dragTarget.value = target
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  updateOverlayByPointer(event)
}

function handlePreviewPointerMove(event: PointerEvent) {
  if (!dragTarget.value) return
  updateOverlayByPointer(event)
}

function stopPreviewDrag() {
  dragTarget.value = null
}

function updateOverlayByPointer(event: PointerEvent) {
  const stage = previewStageRef.value
  if (!stage || !dragTarget.value) return
  const rect = stage.getBoundingClientRect()
  const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100)
  const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100)
  if (dragTarget.value === 'text') {
    captionStyle.x = x
    captionStyle.y = y
    return
  }
  iconStyle.x = x
  iconStyle.y = y
}

function resetOverlayPosition() {
  captionStyle.x = 50
  captionStyle.y = 82
  iconStyle.x = 82
  iconStyle.y = 22
}

function clampPercent(value: unknown, fallback = 50) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(92, Math.max(8, n))
}

function strokeShadow(mode: PetTextStrokeMode, color: string) {
  if (mode === 'none') return 'none'
  const width = mode === 'strong' ? 2 : 1
  return [
    `0 ${width}px 0 ${color}`,
    `${width}px 0 0 ${color}`,
    `-${width}px 0 0 ${color}`,
    `0 -${width}px 0 ${color}`,
    `0 4px 12px rgba(15, 23, 42, 0.24)`,
  ].join(', ')
}

function fontLabel(value: string) {
  if (value === 'Arial Black') return '粗黑体'
  if (value === 'KaiTi') return '手写感'
  return '微软雅黑'
}

function strokeLabel(value: PetTextStrokeMode) {
  if (value === 'none') return '无描边'
  if (value === 'thin') return '轻描边'
  return '强描边'
}
</script>

<style scoped>
.pet-sticker-page {
  display: grid;
  gap: 16px;
}

.pet-sticker-head,
.pet-sticker-panel {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-sticker-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
}

.pet-sticker-head span,
.pet-sticker-section-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-sticker-head h2,
.pet-sticker-section-head h3 {
  margin: 0;
  color: #172033;
  font-weight: 900;
}

.pet-sticker-head h2 {
  margin-top: 6px;
  font-size: 22px;
}

.pet-sticker-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-sticker-head-meta {
  display: grid;
  justify-items: end;
  gap: 4px;
  color: #2563eb;
}

.pet-sticker-head-meta small {
  color: #667085;
}

.pet-sticker-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}

.pet-sticker-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.pet-sticker-mode,
.pet-sticker-chip-row,
.pet-sticker-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pet-sticker-mode button,
.pet-sticker-chip-row button,
.pet-sticker-actions button,
.pet-sticker-section-head button {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 14px;
  font-weight: 850;
  cursor: pointer;
}

.pet-sticker-mode button {
  display: inline-grid;
  gap: 2px;
  justify-items: center;
  min-width: 96px;
}

.pet-sticker-mode small {
  color: #667085;
  font-size: 11px;
  font-weight: 800;
}

.pet-sticker-mode button.active,
.pet-sticker-chip-row button.active {
  border-color: #7aa7ff;
  background: #eff6ff;
  color: #2563eb;
}

.pet-sticker-prompt,
.pet-sticker-param-grid label,
.pet-sticker-style-grid label,
.pet-sticker-position-grid label {
  display: grid;
  gap: 8px;
  color: #475467;
  font-size: 12px;
  font-weight: 850;
}

.pet-sticker-prompt input,
.pet-sticker-param-grid select,
.pet-sticker-param-grid input,
.pet-sticker-style-grid select,
.pet-sticker-style-grid input,
.pet-sticker-position-grid input,
.pet-sticker-caption input:last-child {
  min-height: 42px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 12px;
  font-size: 14px;
}

.pet-sticker-section,
.pet-sticker-reference {
  display: grid;
  gap: 12px;
}

.pet-sticker-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-sticker-reference-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.pet-sticker-reference-card,
.pet-sticker-reference-empty {
  display: grid;
  gap: 8px;
  min-height: 128px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 8px;
  color: #475467;
  text-align: left;
  cursor: pointer;
}

.pet-sticker-reference-card.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.pet-sticker-reference-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  object-fit: cover;
}

.pet-sticker-reference-card span {
  overflow: hidden;
  color: #344054;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-sticker-reference-empty {
  place-items: center;
  color: #2563eb;
  font-weight: 850;
  text-align: center;
}

.pet-sticker-edit-grid,
.pet-sticker-param-grid,
.pet-sticker-style-grid,
.pet-sticker-position-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pet-sticker-param-wide {
  grid-column: 1 / -1;
}

.pet-sticker-edit-grid label,
.pet-sticker-caption {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 0 12px;
  color: #1f2a44;
  font-size: 13px;
  font-weight: 850;
}

.pet-sticker-caption input:last-child {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 30px;
  border: 0;
  background: transparent;
  padding: 0;
}

.pet-sticker-text-editor {
  border-top: 1px solid #edf2f7;
  padding-top: 12px;
}

.pet-sticker-position-value {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 0 12px;
  color: #1f2a44;
  font-size: 13px;
}

.pet-sticker-color-row,
.pet-sticker-icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-sticker-color-row button {
  width: 30px;
  height: 30px;
  border: 2px solid #dfe7f5;
  border-radius: 999px;
  background: var(--swatch);
  cursor: pointer;
}

.pet-sticker-color-row button.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.pet-sticker-icon-row button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 10px;
  font-weight: 850;
  cursor: pointer;
}

.pet-sticker-icon-row button.active {
  border-color: #7aa7ff;
  background: #eff6ff;
  color: #2563eb;
}

.pet-sticker-icon-row span {
  display: inline-grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #2563eb;
}

.pet-sticker-actions button:first-child {
  flex: 1 1 auto;
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.pet-sticker-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.pet-sticker-error,
.pet-sticker-success {
  margin: 0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 800;
}

.pet-sticker-error {
  background: #fff3f0;
  color: #b42318;
}

.pet-sticker-success {
  background: #ecfdf3;
  color: #067647;
}

.pet-sticker-preview {
  position: sticky;
  top: 16px;
}

.pet-sticker-preview-stage {
  position: relative;
  display: grid;
  min-height: 300px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background:
    linear-gradient(45deg, #f4f7fb 25%, transparent 25%),
    linear-gradient(-45deg, #f4f7fb 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f4f7fb 75%),
    linear-gradient(-45deg, transparent 75%, #f4f7fb 75%);
  background-color: #ffffff;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

.pet-sticker-preview-stage img {
  width: min(78%, 260px);
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.pet-sticker-overlay-text,
.pet-sticker-overlay-icon {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.pet-sticker-overlay-text {
  max-width: calc(100% - 48px);
  font-weight: 950;
  text-align: center;
  line-height: 1.15;
  white-space: pre-wrap;
}

.pet-sticker-overlay-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 3px solid #ffffff;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  font-weight: 950;
  line-height: 1;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.pet-sticker-preview-empty {
  color: #98a2b3;
  font-size: 13px;
  font-weight: 850;
}

.pet-sticker-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pet-sticker-result-card {
  display: grid;
  gap: 8px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  padding: 8px;
}

.pet-sticker-result-card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 6px;
  object-fit: cover;
}

.pet-sticker-result-card span {
  overflow: hidden;
  color: #344054;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .pet-sticker-layout {
    grid-template-columns: 1fr;
  }

  .pet-sticker-preview {
    position: static;
  }
}

@media (max-width: 640px) {
  .pet-sticker-head {
    display: grid;
  }

  .pet-sticker-head-meta {
    justify-items: start;
  }

  .pet-sticker-edit-grid,
  .pet-sticker-param-grid,
  .pet-sticker-result-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="asset-picker-compact">
    <div class="asset-picker-summary">
      <strong>{{ title }}</strong>
      <p>{{ selectedLabel || emptyLabel }}</p>
    </div>
    <button class="asset-picker-open" type="button" :disabled="busy" @click="openPicker">
      {{ selectedLabel ? '更换' : '选择' }}
    </button>
  </div>

  <Teleport to="body">
    <div v-if="modalOpen" class="asset-picker-backdrop" @click.self="closePicker">
      <section class="asset-picker-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header class="asset-picker-modal-head">
          <div>
            <h2>{{ title }}</h2>
            <p>{{ emptyLabel }}</p>
            <small v-if="sourceHintText" class="asset-picker-hint">{{ sourceHintText }}</small>
          </div>
          <button class="asset-picker-button" type="button" @click="closePicker">关闭</button>
        </header>

        <div class="asset-picker-search">
          <input
            v-model.trim="keyword"
            :disabled="busy"
            :placeholder="placeholder"
            @keydown.enter.prevent="loadAssets"
          />
          <button class="asset-picker-button" type="button" :disabled="busy" @click="loadAssets">
            {{ busy ? '加载中' : '搜索' }}
          </button>
        </div>

        <div class="asset-picker-scope-filter" role="tablist" aria-label="资产范围">
          <button
            v-for="option in scopeFilterOptions"
            :key="option.value"
            type="button"
            role="tab"
            :class="{ active: selectedScope === option.value }"
            :aria-selected="selectedScope === option.value"
            :disabled="busy"
            @click="setScope(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="roleFilterOptions.length" class="asset-picker-role-filter" role="tablist" aria-label="按素材角色筛选">
          <button
            v-for="option in roleFilterOptions"
            :key="option.value"
            type="button"
            role="tab"
            :class="{ active: selectedRoleFilter === option.value }"
            :aria-selected="selectedRoleFilter === option.value"
            :disabled="busy"
            @click="selectedRoleFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div v-if="errorMessage" class="app-error">{{ errorMessage }}</div>
        <div v-else-if="!busy && filteredAssets.length === 0" class="asset-picker-empty">{{ emptyResultText }}</div>
        <template v-else>
          <div v-if="previewLoading" class="asset-picker-progress">
            已显示列表，正在补充分镜/文案预览 {{ previewLoadedCount }} / {{ previewTotalCount }}
          </div>

          <div
            class="asset-picker-list"
            :class="{ 'asset-picker-list-rich': richJsonMode, 'asset-picker-list-image': isImage }"
          >
            <template v-for="asset in filteredAssets" :key="asset.assetId">
              <article
                v-if="richJsonMode"
                class="asset-picker-item asset-picker-item-rich"
                :class="{ active: selectedAssetId === asset.assetId }"
                role="button"
                tabindex="0"
                @click="highlightAsset(asset)"
                @dblclick="selectAsset(asset)"
                @keydown.enter.prevent="highlightAsset(asset)"
                @keydown.space.prevent="highlightAsset(asset)"
              >
                <div class="asset-picker-rich-main">
                  <img
                    v-if="assetPreview(asset).coverUrl"
                    class="asset-picker-cover"
                    :src="assetPreview(asset).coverUrl"
                    alt=""
                  />
                  <span v-else class="asset-picker-icon asset-picker-icon-rich">{{ assetIcon(asset) }}</span>
                  <span class="asset-picker-meta asset-picker-meta-rich">
                    <strong>{{ assetPreview(asset).title }}</strong>
                    <small>{{ assetPreview(asset).subtitle }}</small>
                    <span v-if="assetRoleLabel(asset)" class="asset-picker-role-tag">{{ assetRoleLabel(asset) }}</span>
                  </span>
                </div>

                <div class="asset-picker-rich-lines">
                  <span v-if="assetPreview(asset).sourceLabel" class="asset-picker-source-line">
                    <b>解析视频：</b>{{ assetPreview(asset).sourceLabel }}
                  </span>
                  <span v-if="assetPreview(asset).sourceTime" class="asset-picker-date">
                    视频上传/发布时间：{{ assetPreview(asset).sourceTime }}
                  </span>
                  <span v-if="assetPreview(asset).previewText" class="asset-picker-preview-text">
                    <b>{{ assetPreview(asset).previewLabel || '预览' }}：</b>{{ assetPreview(asset).previewText }}
                  </span>
                  <span v-else class="asset-picker-preview-text">{{ assetPreview(asset).detail }}</span>
                  <span class="asset-picker-date">资产产出时间：{{ formatDateTime(asset.createdAt) }}</span>
                  <a
                    v-if="assetPreview(asset).sourceUrl"
                    class="asset-picker-source-link"
                    :href="assetPreview(asset).sourceUrl"
                    target="_blank"
                    rel="noreferrer"
                    @click.stop
                  >
                    打开来源视频
                  </a>
                </div>

              </article>
              <button
                v-else
                class="asset-picker-item"
                :class="{ active: selectedAssetId === asset.assetId }"
                type="button"
                :disabled="busy"
                @click="highlightAsset(asset)"
                @dblclick="selectAsset(asset)"
              >
                <img v-if="isImage" :src="resolveUrl(asset.thumbnailUrl || asset.fileUrl)" alt="" />
                <span v-else class="asset-picker-icon">{{ assetIcon(asset) }}</span>
                <span class="asset-picker-meta">
                  <strong>{{ asset.fileName }}</strong>
                  <small>{{ assetListSubtitle(asset) }}</small>
                  <span v-if="assetRoleLabel(asset)" class="asset-picker-role-tag">{{ assetRoleLabel(asset) }}</span>
                  <span class="asset-picker-date">产出时间：{{ formatDateTime(asset.createdAt) }}</span>
                </span>
              </button>
            </template>
          </div>
        </template>

        <footer class="asset-picker-modal-foot">
          <span>{{ activeAsset ? `当前选择：${activeAsset.fileName}` : '单击选中资产，双击可直接选择' }}</span>
          <button
            class="asset-picker-button asset-picker-primary"
            type="button"
            :disabled="busy || !activeAsset"
            @click="confirmSelectedAsset"
          >
            选择
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAssets, getAssetTextContent, type AssetListScope } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import {
  assetWorkflowDisplayMeta,
  assetWorkflowDisplayTitle,
  assetWorkflowPreviewLabel,
  isBenchmarkAsset,
  isStoryboardAsset,
  matchesAssetWorkflowStage,
  normalizeAssetRole as normalizeWorkflowAssetRole,
  normalizedAssetRole as normalizedWorkflowAssetRole,
  roleDisplayLabel as workflowRoleDisplayLabel,
  sourceTypeLabel as workflowSourceTypeLabel,
  type AssetWorkflowStageKey,
} from '../../utils/assetWorkflow'

interface AssetRoleOption {
  value: string
  label: string
}

type PickerScope = Extract<AssetListScope, 'global' | 'private'>

const props = defineProps<{
  title: string
  assetType: AssetType
  assetTypes?: AssetType[]
  selectedUrl?: string
  placeholder?: string
  sourceTypes?: string[]
  sourceHint?: string
  assetRoles?: string[]
  roleOptions?: AssetRoleOption[]
  workflowStage?: AssetWorkflowStageKey
}>()

const emit = defineEmits<{
  (e: 'select', payload: { asset: AssetItem; url: string }): void
}>()

const assets = ref<AssetItem[]>([])
const keyword = ref('')
const busy = ref(false)
const errorMessage = ref('')
const selectedAssetId = ref<number | null>(null)
const selectedAssetName = ref('')
const selectedRoleFilter = ref('all')
const selectedScope = ref<PickerScope>('private')
const modalOpen = ref(false)
const previewByAssetId = ref<Record<number, AssetPickerPreview>>({})
const previewLoading = ref(false)
const previewLoadedCount = ref(0)
const previewTotalCount = ref(0)
const previewRunId = ref(0)
const richPreviewLoadedAssetIds = ref<Set<number>>(new Set())

const RICH_PREVIEW_BATCH_SIZE = 5
const MAX_RICH_PREVIEW_COUNT = 80

const scopeFilterOptions: Array<{ value: PickerScope; label: string }> = [
  { value: 'private', label: '私有素材' },
  { value: 'global', label: '公共素材' },
]
const assetTypesToLoad = computed(() => {
  const values = props.assetTypes?.length ? props.assetTypes : [props.assetType]
  return Array.from(new Set(values))
})
const isImage = computed(() => assetTypesToLoad.value.every((type) => type === 'IMAGE' || type === 'COVER'))
const richJsonMode = computed(() =>
  assetTypesToLoad.value.includes('JSON') ||
  (
    assetTypesToLoad.value.includes('TEXT') &&
    (props.assetRoles || []).map(normalizeAssetRole).some((role) => role === 'benchmark_json' || role === 'storyboard_json' || role === 'voice_script')
  ),
)
const sourceHintText = computed(() => props.sourceHint || '')
const emptyLabel = computed(() => {
  if (isImage.value) return '从资产中心选择图片'
  if (assetTypesToLoad.value.length > 1 && assetTypesToLoad.value.includes('TEXT') && assetTypesToLoad.value.includes('JSON')) return '从资产中心选择脚本/文案'
  if (assetTypesToLoad.value.includes('AUDIO')) return '从资产中心选择音频'
  if (assetTypesToLoad.value.includes('VIDEO')) return '从资产中心选择视频'
  if (assetTypesToLoad.value.includes('JSON')) return '从资产中心选择脚本/分镜'
  if (assetTypesToLoad.value.includes('TEXT')) return '从资产中心选择文案/字幕'
  return '从资产中心选择资产'
})
const selectedLabel = computed(() => {
  if (selectedAssetName.value) {
    return `已选择：${selectedAssetName.value}`
  }
  return props.selectedUrl ? '已填写链接' : ''
})
const allowedAssetRoles = computed(() =>
  (props.assetRoles || []).map(normalizeAssetRole).filter(Boolean),
)
const activeWorkflowStage = computed<AssetWorkflowStageKey>(() => props.workflowStage || inferWorkflowStageFromRoles())
const scenePickerMode = computed(() => activeWorkflowStage.value === 'sceneBundle')
const roleFilterOptions = computed(() => {
  const sourceOptions = props.roleOptions?.length
    ? props.roleOptions
    : props.assetRoles?.length
      ? props.assetRoles.map((value) => ({ value, label: roleDisplayLabel(value) }))
      : []
  const normalizedOptions = sourceOptions
    .map((option) => {
      const value = normalizeAssetRole(option.value)
      return value ? { value, label: option.label || roleDisplayLabel(value) } : null
    })
    .filter((option): option is AssetRoleOption => !!option)
  if (!normalizedOptions.length) {
    return []
  }
  return [{ value: 'all', label: '全部' }, ...dedupeRoleOptions(normalizedOptions)]
})
const filteredAssets = computed(() => {
  const allowed = allowedAssetRoles.value
  const selected = selectedRoleFilter.value === 'all' ? '' : normalizeAssetRole(selectedRoleFilter.value)
  const workflowStage = activeWorkflowStage.value
  return assets.value.filter((asset) => {
    if (workflowStage && !matchesActiveWorkflowStage(asset)) {
      return false
    }
    const role = assetNormalizedRole(asset)
    const genericSceneImage = scenePickerMode.value && assetIsImageLike(asset)
    if (allowed.length > 0 && !allowed.includes(role) && !genericSceneImage) {
      return false
    }
    if (selected) {
      return assetMatchesRoleFilter(asset, selected)
    }
    return true
  })
})
const activeAsset = computed(() =>
  filteredAssets.value.find((asset) => asset.assetId === selectedAssetId.value) || null,
)
const emptyResultText = computed(() =>
  selectedRoleFilter.value === 'all'
    ? `暂无可选${selectedScope.value === 'private' ? '私有' : '公共'}资产`
    : `当前角色下暂无可选${selectedScope.value === 'private' ? '私有' : '公共'}资产`,
)

interface AssetPickerPreview {
  title: string
  subtitle: string
  detail: string
  coverUrl: string
  sourceLabel?: string
  sourceUrl?: string
  sourceTime?: string
  previewLabel?: string
  previewText?: string
}

const ASSET_ROLE_LABELS: Record<string, string> = {
  car_exterior_front: '外观正面',
  car_exterior_side: '外观侧面',
  car_exterior_rear: '外观背面',
  car_exterior_45: '外观 45 度',
  car_exterior_45_degree: '外观 45 度',
  car_interior_dashboard: '内饰中控',
  car_interior_front_seat: '内饰前排',
  car_interior_back_seat: '内饰后排',
  car_interior_steering: '方向盘/仪表',
  car_interior_trunk: '后备箱',
  car_detail_light: '车灯',
  car_detail_wheel: '轮毂',
  car_detail_logo: 'Logo',
  car_detail_seat_material: '座椅材质',
  scene_showroom: '展厅',
  scene_outdoor: '户外场景',
  scene_road: '道路场景',
  scene_night: '夜景/门店',
  host_image: '数字人形象',
  car_model_bundle: '车型素材包',
  voiceover: '口播',
  bgm: 'BGM',
  reference_audio: '参考音频',
  subtitle: '字幕',
  voice_script: '口播文案',
  storyboard_json: '分镜',
  benchmark_json: '爆款对标',
  material_video: '视频素材',
  host_video: '数字人视频',
  reference_video: '参考视频',
}

watch(
  () => props.selectedUrl,
  (value) => {
    if (!value) {
      selectedAssetId.value = null
      selectedAssetName.value = ''
    }
  },
)

watch(
  () => roleFilterOptions.value.map((option) => option.value).join('|'),
  () => {
    if (!roleFilterOptions.value.some((option) => option.value === selectedRoleFilter.value)) {
      selectedRoleFilter.value = 'all'
    }
  },
)

async function openPicker() {
  modalOpen.value = true
  await loadAssets()
}

function closePicker() {
  modalOpen.value = false
  previewRunId.value += 1
  busy.value = false
  previewLoading.value = false
}

function setScope(scope: PickerScope) {
  if (selectedScope.value === scope) {
    return
  }
  selectedScope.value = scope
  if (modalOpen.value) {
    void loadAssets()
  }
}

async function loadAssets() {
  const runId = previewRunId.value + 1
  previewRunId.value = runId
  busy.value = true
  previewLoading.value = false
  previewLoadedCount.value = 0
  previewTotalCount.value = 0
  errorMessage.value = ''
  try {
    const lists = await Promise.all(
      requestAssetTypes().map((assetType) =>
        getAssets({
          scope: selectedScope.value,
          assetType: assetType || undefined,
          keyword: keyword.value || undefined,
          sort: 'createdAtDesc',
        }),
      ),
    )
    if (runId !== previewRunId.value) {
      return
    }
    const rows = dedupeAssets(lists.flat())
    assets.value = sortAssetsByCreatedAtDesc(rows.filter(isSelectableAsset))
    if (selectedAssetId.value && !assets.value.some((asset) => asset.assetId === selectedAssetId.value)) {
      selectedAssetId.value = null
    }
    initializeAssetPreviews()
    busy.value = false
    void loadRichAssetPreviewsInBatches(runId)
  } catch (error) {
    if (runId === previewRunId.value) {
      errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
    }
  } finally {
    if (runId === previewRunId.value) {
      busy.value = false
    }
  }
}

function dedupeAssets(items: AssetItem[]) {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.assetId)) {
      return false
    }
    seen.add(item.assetId)
    return true
  })
}

function requestAssetTypes(): Array<AssetType | ''> {
  const workflowStage = activeWorkflowStage.value
  if (!workflowStage) {
    return assetTypesToLoad.value
  }
  if (workflowStage === 'carBundle') {
    return ['JSON']
  }
  if (workflowStage === 'sceneBundle') {
    const imageTypes = assetTypesToLoad.value.filter((type) => type === 'IMAGE' || type === 'COVER')
    return imageTypes.length ? imageTypes : ['IMAGE', 'COVER']
  }
  if (workflowStage === 'storyboard') {
    return ['JSON']
  }
  if (workflowStage === 'benchmark') {
    return assetTypesToLoad.value.filter((type) => type === 'JSON' || type === 'TEXT')
  }
  return assetTypesToLoad.value
}

function sortAssetsByCreatedAtDesc(items: AssetItem[]) {
  return [...items].sort((a, b) => createdAtMillis(b) - createdAtMillis(a) || b.assetId - a.assetId)
}

function createdAtMillis(asset: AssetItem) {
  const time = new Date(asset.createdAt || '').getTime()
  return Number.isFinite(time) ? time : 0
}

function initializeAssetPreviews() {
  const previews: Record<number, AssetPickerPreview> = {}
  for (const asset of assets.value) {
    previews[asset.assetId] = buildFallbackPreview(asset)
  }
  previewByAssetId.value = previews
  richPreviewLoadedAssetIds.value = new Set()
}

async function loadRichAssetPreviewsInBatches(runId: number) {
  if (!richJsonMode.value) {
    return
  }

  const previewAssets = filteredAssets.value
    .filter((asset) => asset.assetType === 'JSON' || asset.assetType === 'TEXT')
    .filter((asset) => !richPreviewLoadedAssetIds.value.has(asset.assetId))
    .slice(0, MAX_RICH_PREVIEW_COUNT)
  if (!previewAssets.length) {
    return
  }
  previewLoading.value = true
  previewLoadedCount.value = 0
  previewTotalCount.value = previewAssets.length

  for (let index = 0; index < previewAssets.length; index += RICH_PREVIEW_BATCH_SIZE) {
    if (runId !== previewRunId.value || !modalOpen.value) {
      return
    }
    const batch = previewAssets.slice(index, index + RICH_PREVIEW_BATCH_SIZE)
    const entries = await Promise.all(
      batch.map(async (asset) => {
      try {
        const text = await getAssetTextContent(asset)
        return { assetId: asset.assetId, preview: buildJsonPreview(asset, text) }
      } catch {
        return { assetId: asset.assetId, preview: null }
      }
      }),
    )
    if (runId !== previewRunId.value || !modalOpen.value) {
      return
    }
    const nextPreviews = { ...previewByAssetId.value }
    const loaded = new Set(richPreviewLoadedAssetIds.value)
    for (const entry of entries) {
      loaded.add(entry.assetId)
      if (entry.preview) {
        nextPreviews[entry.assetId] = entry.preview
      }
    }
    richPreviewLoadedAssetIds.value = loaded
    previewByAssetId.value = nextPreviews
    previewLoadedCount.value = Math.min(previewAssets.length, index + batch.length)
    await waitForPreviewBatch()
  }
  if (runId === previewRunId.value) {
    previewLoading.value = false
  }
}

function waitForPreviewBatch() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 30)
  })
}

function isSelectableAsset(asset: AssetItem) {
  const workflowStage = activeWorkflowStage.value
  if (workflowStage) {
    return matchesActiveWorkflowStage(asset)
  }
  return isAllowedSourceType(asset)
}

function matchesActiveWorkflowStage(asset: AssetItem) {
  if (scenePickerMode.value && assetIsImageLike(asset)) {
    return true
  }
  return matchesAssetWorkflowStage(asset, activeWorkflowStage.value)
}

function isAllowedSourceType(asset: AssetItem) {
  const allowed = props.sourceTypes?.map((item) => item.trim().toUpperCase()).filter(Boolean)
  if (!allowed || allowed.length === 0) {
    return true
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  if (allowed.includes(sourceType)) {
    return true
  }
  return (
    asset.assetType === 'AUDIO' &&
    sourceType === 'AI_GENERATED' &&
    (allowed.includes('TTS_GENERATE') || allowed.includes('VOICE_SAMPLE'))
  )
}

function inferWorkflowStageFromRoles(): AssetWorkflowStageKey {
  const roles = allowedAssetRoles.value
  if (roles.includes('benchmark_json') || roles.includes('voice_script')) {
    return 'benchmark'
  }
  if (roles.includes('storyboard_json')) {
    return 'storyboard'
  }
  if (roles.includes('car_model_bundle')) {
    return 'carBundle'
  }
  if (roles.includes('scene_material_bundle')) {
    return 'sceneBundle'
  }
  return ''
}

function assetMatchesRoleFilter(asset: AssetItem, role: string) {
  if (scenePickerMode.value && role.startsWith('scene_')) {
    const normalizedRole = assetNormalizedRole(asset)
    return normalizedRole === role || assetMatchesSceneRoleKeyword(asset, role)
  }
  if (role === 'benchmark_json' || role === 'voice_script') {
    return isBenchmarkAsset(asset)
  }
  if (role === 'storyboard_json') {
    return isStoryboardAsset(asset)
  }
  return assetNormalizedRole(asset) === role
}

function assetIsImageLike(asset: AssetItem) {
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const mimeType = String(asset.mimeType || '').trim().toLowerCase()
  return assetType === 'IMAGE' || assetType === 'COVER' || mimeType.startsWith('image/')
}

function assetMatchesSceneRoleKeyword(asset: AssetItem, role: string) {
  const meta = parseObject(asset.metadataJson)
  const text = [
    asset.fileName,
    asset.sourceType,
    asset.assetGroup || '',
    textAt(meta, 'originalFileName'),
    textAt(meta, 'title'),
    textAt(meta, 'sourceTitle'),
    textAt(meta, 'description'),
  ].join(' ').toLowerCase()
  if (role === 'scene_showroom') {
    return ['showroom', '展厅', '门店', 'dealership', 'store'].some((word) => text.includes(word))
  }
  if (role === 'scene_outdoor') {
    return ['outdoor', 'city', '户外', '城市', '街景'].some((word) => text.includes(word))
  }
  if (role === 'scene_road') {
    return ['road', 'highway', 'mountain', '道路', '公路', '山路', '路'].some((word) => text.includes(word))
  }
  if (role === 'scene_night') {
    return ['night', '夜景', '夜晚', '晚上'].some((word) => text.includes(word))
  }
  return false
}

function assetIcon(asset: AssetItem) {
  if (asset.assetType === 'AUDIO') return '音'
  if (asset.assetType === 'VIDEO') return '视'
  if (asset.assetType === 'JSON') return '文'
  if (asset.assetType === 'TEXT') return '稿'
  return '资'
}

function assetPreview(asset: AssetItem) {
  return normalizePreviewWithWorkflowDisplay(asset, previewByAssetId.value[asset.assetId] || buildFallbackPreview(asset))
}

function normalizePreviewWithWorkflowDisplay(asset: AssetItem, preview: AssetPickerPreview): AssetPickerPreview {
  const title = assetWorkflowDisplayTitle(asset)
  const meta = assetWorkflowDisplayMeta(asset)
  const label = assetWorkflowPreviewLabel(asset)
  return {
    ...preview,
    title: title || preview.title,
    subtitle: meta || preview.subtitle,
    previewLabel: label || preview.previewLabel,
  }
}

function buildFallbackPreview(asset: AssetItem): AssetPickerPreview {
  const meta = parseObject(asset.metadataJson)
  const parsedSource = parsedVideoSourceLabel(null, meta)
  const sourceUrl = parsedVideoSourceUrl(null, meta)
  const sourceTime = parsedVideoSourceTime(null, meta, null)
  const previewText = ellipsis(firstText(
    textAt(meta, 'previewText'),
    textAt(meta, 'contentPreview'),
    textAt(meta, 'shotSummary'),
    textAt(meta, 'firstShotPreview'),
    textAt(meta, 'transcriptPreview'),
    textAt(meta, 'summary'),
    textAt(meta, 'description'),
    textAt(meta, 'originalText'),
    textAt(meta, 'content'),
  ), 180)
  const workflowTitle = assetWorkflowDisplayTitle(asset)
  const title = firstText(
    workflowTitle,
    textAt(meta, 'title'),
    textAt(meta, 'sourceTitle'),
    textAt(meta, 'sourceUrl'),
    asset.fileName,
  )
  const count = firstText(textAt(meta, 'shotCount'), textAt(meta, 'scriptCount'))
  const subtitleParts = [
    sourceTypeLabel(asset.sourceType),
    assetRoleLabel(asset),
    asset.assetType,
    count ? `${count} 条内容` : formatFileSize(asset.fileSize),
  ]
  return {
    title,
    subtitle: subtitleParts.filter(Boolean).join(' · '),
    detail: firstText(
      parsedSource ? `解析视频：${parsedSource}` : '',
      sourceUrl,
      textAt(meta, 'videoId'),
      '点击选择后会自动填入到视频制作上下文。',
    ),
    coverUrl: '',
    sourceLabel: parsedSource,
    sourceUrl,
    sourceTime,
    previewLabel: firstText(textAt(meta, 'previewLabel'), rolePreviewLabel(assetNormalizedRole(asset))),
    previewText,
  }
}

function buildJsonPreview(asset: AssetItem, text: string): AssetPickerPreview {
  const parsed = parseObject(text)
  if (!parsed) {
    return buildPlainTextPreview(asset, text)
  }
  if (textAt(parsed, 'bundleType') === 'car_model' || textAt(parsed, 'assetRole') === 'car_model_bundle') {
    const images = arrayAt(parsed, 'images')
    const labels = images
      .map((item) => objectAt(item))
      .map((item) => textAt(item, 'label') || roleDisplayLabel(textAt(item, 'role')))
      .filter(Boolean)
      .slice(0, 6)
    const title = firstText(textAt(parsed, 'brandModel'), asset.fileName)
    const color = textAt(parsed, 'color')
    return {
      title: assetWorkflowDisplayTitle(asset) || `车型素材包：${title}`,
      subtitle: ['车型素材包', color, `${images.length} 张图片`].filter(Boolean).join(' · '),
      detail: labels.length ? `包含：${labels.join('、')}` : '选择后会自动填入车型图和部位标记。',
      coverUrl: resolveUrl(textAt(objectAt(images[0]), 'url')),
    }
  }
  const meta = parseObject(asset.metadataJson)
  const parseResult = objectAt(parsed, 'parseResult')
  const transcriptResult = objectAt(parsed, 'transcriptResult')
  const author = objectAt(parseResult, 'author')
  const shots = firstArrayAt(parsed, ['storyboard', 'scripts', 'shots', 'scenes', 'segments'])

  const benchmarkTitle = firstText(
    textAt(parseResult, 'title'),
    textAt(meta, 'title'),
    textAt(parsed, 'title'),
  )
  const sourceUrl = parsedVideoSourceUrl(parseResult, meta)
  const parsedSource = parsedVideoSourceLabel(parseResult, meta)
  const sourceTime = parsedVideoSourceTime(parseResult, meta, parsed)
  const transcript = firstText(
    textAt(transcriptResult, 'originalText'),
    textAt(parsed, 'originalText'),
    textAt(parsed, 'voiceText'),
    textAt(parsed, 'copywriting'),
    textAt(parsed, 'script'),
    textAt(parsed, 'content'),
    textAt(meta, 'previewText'),
    findTextDeep(parsed, ['originalText', 'transcript', 'voiceText', 'copywriting', 'scriptText']),
  )
  const authorName = firstText(textAt(author, 'nickname'), textAt(author, 'uniqueId'))
  const coverUrl = resolveUrl(firstText(textAt(parseResult, 'coverUrl'), textAt(meta, 'coverUrl'), textAt(parsed, 'coverUrl')))
  const normalizedRole = assetNormalizedRole(asset)
  const storyboardLike = isStoryboardAsset(asset) || normalizedRole === 'storyboard_json'

  if (storyboardLike || shots.length > 0) {
    const firstShot = objectAt(shots[0])
    const shotText = firstText(
      storyboardPreviewText(shots),
      textAt(firstShot, 'visual'),
      textAt(firstShot, 'content'),
      textAt(firstShot, 'narration'),
      textAt(firstShot, 'page'),
      textAt(meta, 'previewText'),
    )
    const source = firstText(parsedSource, sourceUrl, textAt(meta, 'scriptVersionId') ? `脚本版本 ${textAt(meta, 'scriptVersionId')}` : '')
    const previewText = ellipsis(firstText(
      shotText,
      parsedSource ? `来自 ${parsedSource}` : '',
      '暂无镜头摘要，选择后会自动填入分镜控制内容。',
    ), 150)
    return {
      title: assetWorkflowDisplayTitle(asset) || `分镜：${firstText(source, asset.fileName)}`,
      subtitle: `${sourceTypeLabel(asset.sourceType)} · ${shots.length} 个镜头 · ${asset.assetType}`,
      detail: ellipsis(firstText(
        parsedSource ? `解析视频：${parsedSource}${shotText ? ` · 首镜：${shotText}` : ''}` : '',
        shotText,
        '暂无镜头摘要，选择后会自动填入分镜控制内容。',
      ), 110),
      coverUrl: '',
      sourceLabel: firstText(parsedSource, sourceUrl),
      sourceUrl,
      sourceTime,
      previewLabel: shots.length > 1 ? '分镜预览' : '首镜预览',
      previewText,
    }
  }

  if (isBenchmarkAsset(asset) || normalizedRole === 'benchmark_json') {
    const previewText = ellipsis(firstText(
      transcript,
      textAt(meta, 'previewText'),
      benchmarkTitle,
      parsedSource,
      '暂无口播转写，选择后会作为口播参考。',
    ), 220)
    return {
      title: assetWorkflowDisplayTitle(asset) || `爆款对标：${firstText(benchmarkTitle, parsedSource, asset.fileName)}`,
      subtitle: [sourceTypeLabel(asset.sourceType), authorName ? `作者：${authorName}` : '', durationLabel(textAt(parseResult, 'durationSeconds'))]
        .filter(Boolean)
        .join(' · '),
      detail: ellipsis(firstText(
        parsedSource ? `解析视频：${parsedSource}${transcript ? ` · 口播：${transcript}` : ''}` : '',
        transcript,
        sourceUrl,
        '暂无口播转写，选择后会作为口播参考。',
      ), 110),
      coverUrl,
      sourceLabel: firstText(parsedSource, sourceUrl),
      sourceUrl,
      sourceTime,
      previewLabel: transcript ? '口播预览' : '文案预览',
      previewText,
    }
  }

  return buildFallbackPreview(asset)
}

function buildPlainTextPreview(asset: AssetItem, text: string): AssetPickerPreview {
  const fallback = buildFallbackPreview(asset)
  const normalized = ellipsis(text.replace(/\s+/g, ' ').trim(), 220)
  if (!normalized) {
    return fallback
  }
  const role = assetNormalizedRole(asset)
  return {
    ...fallback,
    previewLabel: rolePreviewLabel(role) || '内容预览',
    previewText: normalized,
    detail: normalized,
  }
}

function rolePreviewLabel(role: string) {
  if (role === 'benchmark_json') return '口播预览'
  if (role === 'voice_script') return '口播预览'
  if (role === 'storyboard_json') return '分镜预览'
  return ''
}

function firstArrayAt(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return []
  }
  for (const key of keys) {
    const items = arrayAt(record, key)
    if (items.length) {
      return items
    }
  }
  return []
}

function storyboardPreviewText(shots: unknown[]) {
  return shots
    .slice(0, 3)
    .map((raw, idx) => {
      const shot = objectAt(raw)
      if (!shot) return ''
      const order = firstText(textAt(shot, 'order'), textAt(shot, 'index'), String(idx + 1))
      const time = firstText(textAt(shot, 'time'), textAt(shot, 'duration'), textAt(shot, 'estDurationSec'))
      const content = firstText(
        textAt(shot, 'visual'),
        textAt(shot, 'content'),
        textAt(shot, 'narration'),
        textAt(shot, 'highlight'),
        textAt(shot, 'page'),
      )
      return content ? `镜头${order}${time ? ` ${time}` : ''}：${content}` : ''
    })
    .filter(Boolean)
    .join('；')
}

function assetListSubtitle(asset: AssetItem) {
  return [
    sourceTypeLabel(asset.sourceType),
    assetRoleLabel(asset),
    asset.assetType,
    formatFileSize(asset.fileSize),
  ].filter(Boolean).join(' · ')
}

function assetRoleLabel(asset: AssetItem) {
  return roleDisplayLabel(assetNormalizedRole(asset))
}

function assetNormalizedRole(asset: AssetItem) {
  return normalizedWorkflowAssetRole(asset) || roleFromKind(asset.kind)
}

function parsedVideoSourceUrl(parseResult: Record<string, unknown> | null, meta: Record<string, unknown> | null) {
  return firstText(
    textAt(meta, 'sourceUrl'),
    textAt(meta, 'originalUrl'),
    textAt(meta, 'shareUrl'),
    textAt(meta, 'url'),
    textAt(parseResult, 'sourceUrl'),
    textAt(parseResult, 'shareUrl'),
    textAt(parseResult, 'playUrl'),
    textAt(meta, 'playUrl'),
  )
}

function parsedVideoSourceLabel(parseResult: Record<string, unknown> | null, meta: Record<string, unknown> | null) {
  return firstText(
    textAt(parseResult, 'title'),
    textAt(meta, 'sourceTitle'),
    textAt(meta, 'title'),
    textAt(meta, 'originalFileName'),
    parsedVideoSourceUrl(parseResult, meta),
    textAt(parseResult, 'videoId'),
    textAt(meta, 'videoId'),
  )
}

const SOURCE_TIME_KEYS = [
  'publishTime',
  'publishedAt',
  'publishAt',
  'pubdate',
  'pubDate',
  'createTime',
  'createdAt',
  'create_time',
  'uploadTime',
  'uploadedAt',
  'datePublished',
  'timestamp',
]

function parsedVideoSourceTime(
  parseResult: Record<string, unknown> | null,
  meta: Record<string, unknown> | null,
  payload: Record<string, unknown> | null,
) {
  return formatSourceDate(firstText(
    textFromRecord(parseResult, SOURCE_TIME_KEYS),
    textFromRecord(meta, SOURCE_TIME_KEYS),
    findTextDeep(objectAt(parseResult, 'rawData'), SOURCE_TIME_KEYS),
    findTextDeep(payload, SOURCE_TIME_KEYS),
  ))
}

function textFromRecord(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return ''
  }
  for (const key of keys) {
    const value = primitiveText(record[key])
    if (value) {
      return value
    }
  }
  return ''
}

function findTextDeep(value: unknown, keys: string[], depth = 0): string {
  if (depth > 4 || value == null) {
    return ''
  }
  const keySet = new Set(keys.map((key) => key.toLowerCase()))
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) {
      const found = findTextDeep(item, keys, depth + 1)
      if (found) {
        return found
      }
    }
    return ''
  }
  if (typeof value !== 'object') {
    return ''
  }
  const record = value as Record<string, unknown>
  for (const [key, raw] of Object.entries(record)) {
    if (keySet.has(key.toLowerCase())) {
      const found = primitiveText(raw)
      if (found) {
        return found
      }
    }
  }
  for (const raw of Object.values(record)) {
    const found = findTextDeep(raw, keys, depth + 1)
    if (found) {
      return found
    }
  }
  return ''
}

function primitiveText(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function formatSourceDate(value: string) {
  const text = value.trim()
  if (!text) {
    return ''
  }
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text)
    const millis = text.length === 10 ? numeric * 1000 : numeric
    return formatDateTime(new Date(millis).toISOString())
  }
  const normalized = text.includes(' ') && !text.includes('T') ? text.replace(' ', 'T') : text
  const date = new Date(normalized)
  if (!Number.isNaN(date.getTime())) {
    return formatDateTime(date.toISOString())
  }
  return text
}

function roleDisplayLabel(role: string) {
  return workflowRoleDisplayLabel(role) || normalizeAssetRole(role)
}

function normalizeAssetRole(role: string | null | undefined) {
  return normalizeWorkflowAssetRole(role)
}

function roleFromKind(kind: string | null | undefined) {
  const normalized = normalizeAssetRole(kind)
  if (!normalized || ['generated', 'upload', 'uploaded', 'user_upload', 'manual_created'].includes(normalized)) {
    return ''
  }
  return ASSET_ROLE_LABELS[normalized] ? normalized : ''
}

function dedupeRoleOptions(options: AssetRoleOption[]) {
  const seen = new Set<string>()
  const rows: AssetRoleOption[] = []
  for (const option of options) {
    if (seen.has(option.value)) {
      continue
    }
    seen.add(option.value)
    rows.push(option)
  }
  return rows
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  return workflowSourceTypeLabel(sourceType)
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function objectAt(value: unknown, key?: string): Record<string, unknown> | null {
  const source = key ? parseObject(value)?.[key] : value
  return source && typeof source === 'object' && !Array.isArray(source) ? source as Record<string, unknown> : null
}

function arrayAt(value: Record<string, unknown> | null, key: string): unknown[] {
  const found = value?.[key]
  return Array.isArray(found) ? found : []
}

function textAt(value: Record<string, unknown> | null, key: string): string {
  const found = value?.[key]
  if (found == null) {
    return ''
  }
  if (typeof found === 'string') {
    return found.trim()
  }
  if (typeof found === 'number') {
    return String(found)
  }
  return ''
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || ''
}

function ellipsis(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}…`
}

function durationLabel(value: string) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ''
  }
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec} 秒`
}

function selectAsset(asset: AssetItem) {
  selectedAssetId.value = asset.assetId
  selectedAssetName.value = asset.fileName
  emit('select', { asset, url: resolveUrl(asset.fileUrl) })
  closePicker()
}

function highlightAsset(asset: AssetItem) {
  if (busy.value) {
    return
  }
  selectedAssetId.value = asset.assetId
}

function confirmSelectedAsset() {
  if (!activeAsset.value) {
    return
  }
  selectAsset(activeAsset.value)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function resolveUrl(url: string | null | undefined) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
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

<style scoped>
.asset-picker-compact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 12px 14px;
}

.asset-picker-summary {
  min-width: 0;
}

.asset-picker-summary strong {
  display: block;
  color: #232838;
  font-size: 13px;
  font-weight: 800;
}

.asset-picker-summary p {
  margin: 4px 0 0;
  overflow: hidden;
  color: #667085;
  font-size: 12.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-open,
.asset-picker-button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.asset-picker-open:hover:not(:disabled),
.asset-picker-button:hover:not(:disabled) {
  border-color: #c8bfff;
  background: #faf9ff;
  color: #5e50df;
}

.asset-picker-primary {
  border-color: #4f46e5;
  background: #4f46e5;
  color: #ffffff;
}

.asset-picker-primary:hover:not(:disabled) {
  border-color: #4338ca;
  background: #4338ca;
  color: #ffffff;
}

.asset-picker-open:disabled,
.asset-picker-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asset-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
  overflow: hidden;
}

.asset-picker-modal {
  display: flex;
  flex-direction: column;
  width: min(820px, 100%);
  height: min(82vh, 680px);
  max-height: calc(100vh - 40px);
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
  padding: 16px;
  gap: 14px;
}

.asset-picker-modal-head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.asset-picker-modal-head h2 {
  margin: 0 0 4px;
  color: #151a2d;
  font-size: 17px;
  font-weight: 850;
}

.asset-picker-modal-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.asset-picker-modal-foot {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #eef0f6;
  padding-top: 12px;
}

.asset-picker-modal-foot span {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 12.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-hint {
  display: block;
  margin-top: 4px;
  color: #5e50df;
  font-size: 12px;
  font-weight: 750;
}

.asset-picker-search {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.asset-picker-search input {
  width: 100%;
  min-width: 0;
  height: 38px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  font-size: 13px;
  outline: none;
}

.asset-picker-search input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.asset-picker-role-filter {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.asset-picker-scope-filter {
  display: inline-flex;
  flex: 0 0 auto;
  width: fit-content;
  min-height: 38px;
  overflow: visible;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #f8fafc;
  padding: 3px;
}

.asset-picker-scope-filter button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}

.asset-picker-scope-filter button.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.asset-picker-scope-filter button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asset-picker-role-filter button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3e7ef;
  border-radius: 999px;
  background: #fff;
  color: #4f586c;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.asset-picker-role-filter button.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.asset-picker-role-filter button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.asset-picker-progress {
  flex: 0 0 auto;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
}

.asset-picker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
}

.asset-picker-list-rich {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.asset-picker-list-image {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.asset-picker-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid #eef0f6;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
  color: #232838;
  text-align: left;
  cursor: pointer;
}

.asset-picker-item-rich {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  min-height: 196px;
  padding: 12px;
}

.asset-picker-rich-main {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
}

.asset-picker-rich-lines {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.asset-picker-item.active,
.asset-picker-item:hover:not(:disabled) {
  border-color: #bdb4ff;
  background: #faf9ff;
}

.asset-picker-item.active {
  box-shadow: inset 0 0 0 1px #d8d2ff;
}

.asset-picker-list-image .asset-picker-item {
  grid-template-columns: 78px minmax(0, 1fr);
}

.asset-picker-item img,
.asset-picker-icon {
  width: 44px;
  height: 44px;
  border-radius: 7px;
  background: #eef0f6;
  object-fit: cover;
}

.asset-picker-list-image .asset-picker-item img {
  width: 78px;
  height: 96px;
  background: #f8fafc;
  object-fit: contain;
}

.asset-picker-icon {
  display: grid;
  place-items: center;
  color: #635bff;
  font-size: 18px;
  font-weight: 900;
}

.asset-picker-cover,
.asset-picker-icon-rich {
  width: 74px !important;
  height: 74px !important;
}

.asset-picker-cover {
  border-radius: 8px;
  background: #eef0f6;
  object-fit: cover;
}

.asset-picker-meta {
  min-width: 0;
}

.asset-picker-meta strong,
.asset-picker-meta small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-meta strong {
  font-size: 12.5px;
}

.asset-picker-meta-rich strong {
  font-size: 13.5px;
}

.asset-picker-meta small,
.asset-picker-empty {
  color: #98a2b3;
  font-size: 12px;
}

.asset-picker-role-tag {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  margin-top: 5px;
  overflow: hidden;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 900;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-source-line,
.asset-picker-preview-text,
.asset-picker-date {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #5d667a;
  font-size: 12px;
  line-height: 1.45;
}

.asset-picker-source-line {
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-picker-source-line b,
.asset-picker-preview-text b {
  color: #344054;
}

.asset-picker-preview-text {
  display: -webkit-box;
  min-height: 50px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.asset-picker-source-link {
  width: fit-content;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.asset-picker-source-link:hover {
  text-decoration: underline;
}

.asset-picker-date {
  color: #667085;
  font-weight: 750;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.asset-picker-empty {
  display: grid;
  flex: 1 1 auto;
  min-height: 180px;
  place-items: center;
  border: 1px dashed #dfe3ed;
  border-radius: 10px;
  background: #fbfcff;
}

@media (max-width: 640px) {
  .asset-picker-compact,
  .asset-picker-search {
    grid-template-columns: 1fr;
  }

  .asset-picker-modal-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

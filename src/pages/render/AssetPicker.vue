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

        <div v-else class="asset-picker-list" :class="{ 'asset-picker-list-rich': richJsonMode }">
          <button
            v-for="asset in filteredAssets"
            :key="asset.assetId"
            class="asset-picker-item"
            :class="{ 'asset-picker-item-rich': richJsonMode, active: selectedAssetId === asset.assetId }"
            type="button"
            :disabled="busy"
            @click="selectAsset(asset)"
          >
            <template v-if="richJsonMode">
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
                <span class="asset-picker-preview-text">{{ assetPreview(asset).detail }}</span>
                <span class="asset-picker-date">产出时间：{{ formatDateTime(asset.createdAt) }}</span>
              </span>
            </template>
            <template v-else>
              <img v-if="isImage" :src="resolveUrl(asset.thumbnailUrl || asset.fileUrl)" alt="" />
              <span v-else class="asset-picker-icon">{{ assetIcon(asset) }}</span>
              <span class="asset-picker-meta">
                <strong>{{ asset.fileName }}</strong>
                <small>{{ assetListSubtitle(asset) }}</small>
                <span v-if="assetRoleLabel(asset)" class="asset-picker-role-tag">{{ assetRoleLabel(asset) }}</span>
                <span class="asset-picker-date">产出时间：{{ formatDateTime(asset.createdAt) }}</span>
              </span>
            </template>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAssets, getAssetTextContent } from '../../services/assetApi'
import { getAvatars } from '../../services/avatarApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { AvatarItem } from '../../types/avatarTypes'

interface AssetRoleOption {
  value: string
  label: string
}

const props = defineProps<{
  title: string
  assetType: AssetType
  selectedUrl?: string
  placeholder?: string
  sourceTypes?: string[]
  sourceHint?: string
  assetRoles?: string[]
  roleOptions?: AssetRoleOption[]
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
const modalOpen = ref(false)
const previewByAssetId = ref<Record<number, AssetPickerPreview>>({})

const isImage = computed(() => props.assetType === 'IMAGE' || props.assetType === 'COVER')
const richJsonMode = computed(() => props.assetType === 'JSON')
const shouldLoadAvatarProfiles = computed(() =>
  props.assetType === 'IMAGE' &&
  (
    pickerMentionsAvatar(props.title) ||
    (props.assetRoles || []).some((role) => normalizeAssetRole(role) === 'host_image') ||
    (props.roleOptions || []).some((option) => normalizeAssetRole(option.value) === 'host_image')
  ),
)
const sourceHintText = computed(() => props.sourceHint || '')
const emptyLabel = computed(() => {
  if (isImage.value) return '从资产中心选择图片'
  if (props.assetType === 'AUDIO') return '从资产中心选择音频'
  if (props.assetType === 'VIDEO') return '从资产中心选择视频'
  if (props.assetType === 'JSON') return '从资产中心选择脚本/分镜'
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
  return assets.value.filter((asset) => {
    const role = assetNormalizedRole(asset)
    if (allowed.length > 0 && !allowed.includes(role)) {
      return false
    }
    if (selected && role && role !== selected) {
      return false
    }
    return true
  })
})
const emptyResultText = computed(() =>
  selectedRoleFilter.value === 'all' ? '暂无可选资产' : '当前角色下暂无可选资产',
)

interface AssetPickerPreview {
  title: string
  subtitle: string
  detail: string
  coverUrl: string
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

const ASSET_ROLE_ALIASES: Record<string, string> = {
  front: 'car_exterior_front',
  exterior_front: 'car_exterior_front',
  car_front: 'car_exterior_front',
  side: 'car_exterior_side',
  exterior_side: 'car_exterior_side',
  rear: 'car_exterior_rear',
  back: 'car_exterior_rear',
  exterior_rear: 'car_exterior_rear',
  '45': 'car_exterior_45',
  '45_degree': 'car_exterior_45',
  car_exterior_45_degree: 'car_exterior_45',
  dashboard: 'car_interior_dashboard',
  interior: 'car_interior_dashboard',
  interior_dashboard: 'car_interior_dashboard',
  front_seat: 'car_interior_front_seat',
  back_seat: 'car_interior_back_seat',
  rear_seat: 'car_interior_back_seat',
  steering: 'car_interior_steering',
  steering_wheel: 'car_interior_steering',
  instrument: 'car_interior_steering',
  trunk: 'car_interior_trunk',
  boot: 'car_interior_trunk',
  light: 'car_detail_light',
  headlight: 'car_detail_light',
  wheel: 'car_detail_wheel',
  seat: 'car_detail_seat_material',
  seat_material: 'car_detail_seat_material',
  showroom: 'scene_showroom',
  scene: 'scene_showroom',
  road: 'scene_road',
  outdoor: 'scene_outdoor',
  city: 'scene_outdoor',
  mountain: 'scene_road',
  highway: 'scene_road',
  night: 'scene_night',
  dealership: 'scene_showroom',
  host: 'host_image',
  avatar: 'host_image',
  car_bundle: 'car_model_bundle',
  model_bundle: 'car_model_bundle',
  car_model: 'car_model_bundle',
  voice: 'voiceover',
  voice_over: 'voiceover',
  tts: 'voiceover',
  music: 'bgm',
  storyboard: 'storyboard_json',
  benchmark: 'benchmark_json',
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
}

async function loadAssets() {
  busy.value = true
  errorMessage.value = ''
  try {
    let rows = await getAssets({
      scope: 'all',
      assetType: props.assetType,
      keyword: keyword.value || undefined,
      sort: 'createdAtDesc',
    })
    if (shouldLoadAvatarProfiles.value) {
      rows = mergeAvatarProfileAssets(rows, await loadAvatarProfileAssets(keyword.value))
    }
    assets.value = rows.filter(isAllowedSourceType)
    await loadAssetPreviews()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    busy.value = false
  }
}

async function loadAvatarProfileAssets(searchText: string) {
  try {
    const avatars = await getAvatars()
    return avatars
      .map(avatarToAsset)
      .filter((asset): asset is AssetItem => !!asset)
      .filter((asset) => assetMatchesKeyword(asset, searchText))
  } catch {
    return []
  }
}

function avatarToAsset(avatar: AvatarItem): AssetItem | null {
  if (!avatar.assetId || !avatar.previewUrl) {
    return null
  }
  return {
    assetId: avatar.assetId,
    ownerUserId: avatar.ownerUserId ?? null,
    createdByUserId: avatar.createdByUserId ?? null,
    projectId: avatar.projectId,
    taskId: avatar.taskId,
    assetType: 'IMAGE',
    kind: 'AVATAR',
    visibility: avatar.visibility ?? null,
    status: avatar.status ?? null,
    publishedAt: null,
    fileName: avatar.avatarName || `数字人形象 ${avatar.avatarId}`,
    filePath: null,
    fileUrl: avatar.previewUrl,
    thumbnailUrl: avatar.previewUrl,
    mimeType: 'image/*',
    fileSize: 0,
    sourceType: avatar.sourceType || 'USER_UPLOAD',
    metadataJson: mergeMetadataJson(avatar.metadataJson, {
      from: 'avatar_profile',
      assetRole: 'host_image',
      avatarId: avatar.avatarId,
      avatarName: avatar.avatarName,
      defaultAvatar: avatar.defaultAvatar,
      prompt: avatar.prompt,
    }),
    createdAt: avatar.createdAt,
    updatedAt: avatar.updatedAt,
  }
}

function mergeAvatarProfileAssets(assetRows: AssetItem[], avatarRows: AssetItem[]) {
  if (!avatarRows.length) {
    return assetRows
  }
  const byId = new Map<number, AssetItem>()
  for (const asset of assetRows) {
    byId.set(asset.assetId, asset)
  }
  for (const avatarAsset of avatarRows) {
    const existing = byId.get(avatarAsset.assetId)
    if (!existing) {
      byId.set(avatarAsset.assetId, avatarAsset)
      continue
    }
    byId.set(avatarAsset.assetId, {
      ...existing,
      kind: existing.kind || avatarAsset.kind,
      fileName: avatarAsset.fileName || existing.fileName,
      fileUrl: existing.fileUrl || avatarAsset.fileUrl,
      thumbnailUrl: existing.thumbnailUrl || avatarAsset.thumbnailUrl,
      metadataJson: mergeMetadataJson(existing.metadataJson, parseObject(avatarAsset.metadataJson) || {}),
    })
  }
  return Array.from(byId.values())
}

function assetMatchesKeyword(asset: AssetItem, searchText: string) {
  const q = searchText.trim().toLowerCase()
  if (!q) {
    return true
  }
  return [
    asset.fileName,
    asset.sourceType,
    sourceTypeLabel(asset.sourceType),
    assetRoleLabel(asset),
    asset.metadataJson,
  ].some((value) => String(value || '').toLowerCase().includes(q))
}

async function loadAssetPreviews() {
  const previews: Record<number, AssetPickerPreview> = {}
  for (const asset of assets.value) {
    previews[asset.assetId] = buildFallbackPreview(asset)
  }
  previewByAssetId.value = previews
  if (!richJsonMode.value) {
    return
  }

  const jsonAssets = assets.value.filter((asset) => asset.assetType === 'JSON').slice(0, 30)
  await Promise.all(
    jsonAssets.map(async (asset) => {
      try {
        const text = await getAssetTextContent(asset)
        previewByAssetId.value = {
          ...previewByAssetId.value,
          [asset.assetId]: buildJsonPreview(asset, text),
        }
      } catch {
        // Fallback metadata preview is already in place.
      }
    }),
  )
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

function assetIcon(asset: AssetItem) {
  if (asset.assetType === 'AUDIO') return '音'
  if (asset.assetType === 'VIDEO') return '视'
  if (asset.assetType === 'JSON') return '文'
  if (asset.assetType === 'TEXT') return '稿'
  return '资'
}

function assetPreview(asset: AssetItem) {
  return previewByAssetId.value[asset.assetId] || buildFallbackPreview(asset)
}

function buildFallbackPreview(asset: AssetItem): AssetPickerPreview {
  const meta = parseObject(asset.metadataJson)
  const title = firstText(
    textAt(meta, 'title'),
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
    detail: firstText(textAt(meta, 'sourceUrl'), textAt(meta, 'videoId'), '点击选择后会自动填入到视频制作上下文。'),
    coverUrl: '',
  }
}

function buildJsonPreview(asset: AssetItem, text: string): AssetPickerPreview {
  const parsed = parseObject(text)
  if (!parsed) {
    return buildFallbackPreview(asset)
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
      title: `车型素材包：${title}`,
      subtitle: ['车型素材包', color, `${images.length} 张图片`].filter(Boolean).join(' · '),
      detail: labels.length ? `包含：${labels.join('、')}` : '选择后会自动填入车型图和部位标记。',
      coverUrl: resolveUrl(textAt(objectAt(images[0]), 'url')),
    }
  }
  const meta = parseObject(asset.metadataJson)
  const parseResult = objectAt(parsed, 'parseResult')
  const transcriptResult = objectAt(parsed, 'transcriptResult')
  const author = objectAt(parseResult, 'author')
  const scripts = arrayAt(parsed, 'scripts')
  const storyboard = arrayAt(parsed, 'storyboard')
  const shots = storyboard.length > 0 ? storyboard : scripts

  const benchmarkTitle = firstText(
    textAt(parseResult, 'title'),
    textAt(meta, 'title'),
  )
  const sourceUrl = firstText(textAt(meta, 'sourceUrl'), textAt(parseResult, 'playUrl'), textAt(parseResult, 'sourceUrl'))
  const transcript = firstText(textAt(transcriptResult, 'originalText'), textAt(parsed, 'originalText'))
  const authorName = firstText(textAt(author, 'nickname'), textAt(author, 'uniqueId'))
  const coverUrl = resolveUrl(firstText(textAt(parseResult, 'coverUrl'), textAt(parsed, 'coverUrl')))

  if (benchmarkTitle || transcript || sourceTypeLabel(asset.sourceType).includes('爆款')) {
    return {
      title: firstText(benchmarkTitle, asset.fileName),
      subtitle: [sourceTypeLabel(asset.sourceType), authorName ? `作者：${authorName}` : '', durationLabel(textAt(parseResult, 'durationSeconds'))]
        .filter(Boolean)
        .join(' · '),
      detail: ellipsis(firstText(transcript, sourceUrl, '暂无口播转写，选择后会作为口播参考。'), 92),
      coverUrl,
    }
  }

  if (shots.length > 0) {
    const firstShot = objectAt(shots[0])
    const shotText = firstText(
      textAt(firstShot, 'visual'),
      textAt(firstShot, 'content'),
      textAt(firstShot, 'narration'),
      textAt(firstShot, 'page'),
    )
    const source = firstText(sourceUrl, textAt(meta, 'scriptVersionId') ? `脚本版本 ${textAt(meta, 'scriptVersionId')}` : '')
    return {
      title: firstText(source, asset.fileName),
      subtitle: `${sourceTypeLabel(asset.sourceType)} · ${shots.length} 个镜头 · ${asset.assetType}`,
      detail: ellipsis(firstText(shotText, '暂无镜头摘要，选择后会自动填入分镜控制内容。'), 92),
      coverUrl: '',
    }
  }

  return buildFallbackPreview(asset)
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
  const meta = parseObject(asset.metadataJson)
  const explicit = normalizeAssetRole(firstText(
    textAt(meta, 'assetRole'),
    textAt(meta, 'role'),
    typeof asset.kind === 'string' ? asset.kind : '',
  ))
  return explicit || inferAssetRole(asset, meta)
}

function inferAssetRole(asset: AssetItem, meta: Record<string, unknown> | null) {
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const from = textAt(meta, 'from').toLowerCase()
  const source = textAt(meta, 'source').toUpperCase()
  const bundleType = textAt(meta, 'bundleType').toLowerCase()
  if (assetType === 'IMAGE') {
    if (
      sourceType === 'AVATAR_GENERATE' ||
      from.includes('avatar') ||
      source === 'DOUBAO_SEEDREAM' ||
      Boolean(textAt(meta, 'avatarName'))
    ) {
      return 'host_image'
    }
    return ''
  }
  if (assetType === 'JSON') {
    if (bundleType === 'car_model') {
      return 'car_model_bundle'
    }
    if (['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'].includes(sourceType)) {
      return 'benchmark_json'
    }
    if (['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'].includes(sourceType)) {
      return 'storyboard_json'
    }
  }
  if (assetType === 'AUDIO' && ['TTS_GENERATE', 'VOICE_SAMPLE'].includes(sourceType)) {
    return 'voiceover'
  }
  if (assetType === 'VIDEO' && sourceType === 'DIGITAL_HUMAN_GENERATE') {
    return 'host_video'
  }
  return ''
}

function roleDisplayLabel(role: string) {
  const normalized = normalizeAssetRole(role)
  if (!normalized) {
    return ''
  }
  return ASSET_ROLE_LABELS[normalized] || normalized
}

function normalizeAssetRole(role: string | null | undefined) {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized ? ASSET_ROLE_ALIASES[normalized] || normalized : ''
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
  const key = String(sourceType || '').trim().toUpperCase()
  const labels: Record<string, string> = {
    DOUYIN_BENCHMARK: '爆款对标',
    DOUYIN_PARSE_TRANSCRIPT: '爆款转写',
    DOUYIN_REWRITE: '爆款改写',
    DOUYIN_TRANSCRIPT: '爆款口播',
    SCRIPT_REWRITE: '文案改写',
    VIDEO_SCRIPT_ANALYZE: '分镜生成',
    VIDEO_SCRIPT_URL_ANALYZE: '链接分镜',
    STORYBOARD_GENERATE: '分镜生成',
    TTS_GENERATE: '声音生成',
    VOICE_SAMPLE: '声音试音',
    DIGITAL_HUMAN_GENERATE: '数字人视频',
    AVATAR_GENERATE: '数字人形象',
    USER_UPLOAD: '上传素材',
    MANUAL_CREATED: '手动创建',
    AI_GENERATED: 'AI生成',
    DEMO: '演示素材',
    SEEDANCE_TEXT_VIDEO: '文生视频',
    SEEDANCE_FIRST_FRAME_VIDEO: '图生视频',
    SEEDANCE_FIRST_LAST_FRAME_VIDEO: '图生视频',
    SEEDANCE_REFERENCE_VIDEO: '图生视频',
    SEEDANCE_CAR_SALES_VIDEO: '汽车销售成片',
  }
  return labels[key] || key || '未知来源'
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

function pickerMentionsAvatar(title: string) {
  return ['数字人', '主播', '形象'].some((token) => title.includes(token))
}

function mergeMetadataJson(base: string | null | undefined, extra: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...(parseObject(base) || {}) }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') {
      merged[key] = value
    }
  }
  return JSON.stringify(merged)
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
}

.asset-picker-modal {
  display: grid;
  width: min(820px, 100%);
  max-height: min(82vh, 680px);
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

.asset-picker-hint {
  display: block;
  margin-top: 4px;
  color: #5e50df;
  font-size: 12px;
  font-weight: 750;
}

.asset-picker-search {
  display: grid;
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
  flex-wrap: wrap;
  gap: 8px;
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

.asset-picker-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  min-height: 180px;
  overflow: auto;
  padding-right: 2px;
}

.asset-picker-list-rich {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
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
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: start;
  min-height: 126px;
  padding: 12px;
}

.asset-picker-item.active,
.asset-picker-item:hover:not(:disabled) {
  border-color: #bdb4ff;
  background: #faf9ff;
}

.asset-picker-item.active {
  box-shadow: inset 0 0 0 1px #d8d2ff;
}

.asset-picker-item img,
.asset-picker-icon {
  width: 44px;
  height: 44px;
  border-radius: 7px;
  background: #eef0f6;
  object-fit: cover;
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

.asset-picker-preview-text,
.asset-picker-date {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: #5d667a;
  font-size: 12px;
  line-height: 1.45;
}

.asset-picker-preview-text {
  display: -webkit-box;
  min-height: 34px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.asset-picker-date {
  color: #667085;
  font-weight: 750;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.asset-picker-empty {
  display: grid;
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

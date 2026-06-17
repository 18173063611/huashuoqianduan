<template>
  <Teleport to="body">
    <div v-if="modelValue" class="car-asset-backdrop" @click.self="close">
      <aside class="car-asset-drawer" aria-label="资产中心选择">
        <header class="car-asset-head">
          <div>
            <h2>{{ drawerTitle }}</h2>
            <p>{{ drawerDescription }}</p>
          </div>
          <button type="button" class="car-asset-close" aria-label="关闭资产选择" @click="close">×</button>
        </header>

        <div class="car-asset-layout" :class="{ 'car-asset-layout--single': isLockedCategory }">
          <nav v-if="!isLockedCategory" class="car-asset-nav" aria-label="资产分类">
            <button
              v-for="category in visibleCategories"
              :key="category.key"
              type="button"
              :class="{ active: activeCategoryKey === category.key }"
              @click="setCategory(category.key)"
            >
              <strong>{{ category.label }}</strong>
              <small>{{ category.hint }}</small>
            </button>
          </nav>

          <main class="car-asset-main">
            <div class="car-asset-toolbar">
              <input
                v-model.trim="keyword"
                :disabled="loading"
                :placeholder="activeCategory.placeholder"
                @keydown.enter.prevent="loadAssets"
              />
              <select v-model="scope" :disabled="loading" aria-label="资产范围">
                <option value="private">私有素材</option>
                <option value="global">公共素材</option>
                <option value="all">全部素材</option>
              </select>
              <button type="button" class="car-asset-button" :disabled="loading" @click="loadAssets">
                {{ loading ? '加载中...' : '搜索' }}
              </button>
            </div>

            <p v-if="activeCategory.description" class="car-asset-tip">{{ activeCategory.description }}</p>
            <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
            <div v-else-if="loading" class="car-asset-empty">正在加载资产。</div>
            <div v-else-if="filteredAssets.length === 0" class="car-asset-empty">
              当前分类暂无匹配资产。
            </div>
            <div v-else class="car-asset-grid">
              <article v-for="asset in filteredAssets" :key="asset.assetId" class="car-asset-card">
                <div
                  class="car-asset-preview"
                  :class="{ 'car-asset-preview--bundle': assetPreviewImages(asset).length > 0 }"
                >
                  <template v-if="assetPreviewImages(asset).length > 0">
                    <img class="car-asset-preview-main" :src="assetPreviewImages(asset)[0]" :alt="assetPreviewTitle(asset)" />
                    <div v-if="assetPreviewImages(asset).length > 1" class="car-asset-preview-strip">
                      <img
                        v-for="url in assetPreviewImages(asset).slice(1, 4)"
                        :key="url"
                        :src="url"
                        alt=""
                      />
                    </div>
                    <small v-if="assetPreviewImageCount(asset)" class="car-asset-preview-badge">
                      {{ assetPreviewImageCount(asset) }} 张图
                    </small>
                  </template>
                  <img v-else-if="assetPreviewImageUrl(asset)" :src="assetPreviewImageUrl(asset)" :alt="asset.fileName" />
                  <video
                    v-else-if="assetVideoUrl(asset)"
                    :src="assetVideoUrl(asset)"
                    muted
                    preload="metadata"
                    playsinline
                  />
                  <span v-else>{{ assetIcon(asset) }}</span>
                </div>
                <div class="car-asset-info">
                  <strong>{{ assetPreviewTitle(asset) }}</strong>
                  <p>{{ assetPreviewMeta(asset) }}</p>
                </div>
                <label v-if="!isLockedCategory || activeCategory.roles.length > 1" class="car-asset-role">
                  <span>加入为</span>
                  <select v-model="selectedRoleByAssetId[asset.assetId]">
                    <option v-for="role in activeCategory.roles" :key="role.value" :value="role.value">
                      {{ role.label }}
                    </option>
                  </select>
                </label>
                <button type="button" class="car-asset-primary" @click="selectAsset(asset)">
                  {{ isLockedCategory ? '选择该车型素材包' : '加入本次生成' }}
                </button>
              </article>
            </div>
          </main>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAssetTextContent, getAssets, type AssetListScope } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { QuickRenderAssetRole } from '../../types/videoTypes'

export type CarSalesAssetCategoryKey =
  | 'vehicle'
  | 'scene'
  | 'carBundle'
  | 'avatar'
  | 'bgm'
  | 'script'
  | 'video'

export interface CarSalesAssetSelectPayload {
  asset: AssetItem
  role: QuickRenderAssetRole
  category: CarSalesAssetCategoryKey
}

interface RoleOption {
  value: QuickRenderAssetRole
  label: string
}

interface AssetCategory {
  key: CarSalesAssetCategoryKey
  label: string
  hint: string
  description: string
  placeholder: string
  assetTypes: AssetType[]
  roles: RoleOption[]
  defaultRole: QuickRenderAssetRole
}

interface CarBundlePreview {
  title: string
  meta: string
  images: string[]
  imageCount: number
}

const props = defineProps<{
  modelValue: boolean
  initialCategory?: CarSalesAssetCategoryKey
  lockedCategory?: CarSalesAssetCategoryKey | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [payload: CarSalesAssetSelectPayload]
}>()

const vehicleRoles: RoleOption[] = [
  { value: 'car_exterior_front', label: '车头外观' },
  { value: 'car_exterior_side', label: '车侧外观' },
  { value: 'car_exterior_rear', label: '车尾外观' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'car_interior_front_seat', label: '前排座椅' },
  { value: 'car_interior_back_seat', label: '后排座椅' },
  { value: 'car_detail_sunroof', label: '天窗细节' },
  { value: 'car_detail_light', label: '车灯细节' },
  { value: 'car_detail_wheel', label: '轮毂细节' },
  { value: 'car_detail_logo', label: '车标细节' },
]

const sceneRoles: RoleOption[] = [
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'scene_outdoor', label: '户外场景' },
  { value: 'scene_road', label: '道路场景' },
  { value: 'scene_night', label: '夜景/门店' },
]

const categories: AssetCategory[] = [
  {
    key: 'carBundle',
    label: '车型素材包',
    hint: '结构化车型资料',
    description: '一键生成优先选择车型素材包；素材包会自动带入车辆图集、卖点和参数。',
    placeholder: '搜索车型素材包...',
    assetTypes: ['JSON'],
    roles: [{ value: 'car_model_bundle', label: '车型素材包' }],
    defaultRole: 'car_model_bundle',
  },
  {
    key: 'vehicle',
    label: '车辆图片',
    hint: '外观 / 内饰 / 细节',
    description: '适合补充车头、车侧、内饰、轮毂、车灯等车辆镜头。',
    placeholder: '搜索车型、外观、内饰、轮毂...',
    assetTypes: ['IMAGE', 'COVER'],
    roles: vehicleRoles,
    defaultRole: 'car_exterior_front',
  },
  {
    key: 'scene',
    label: '场景图片',
    hint: '展厅 / 户外 / 道路',
    description: '用于补充展厅、道路、门店夜景等分镜背景。',
    placeholder: '搜索展厅、道路、门店、城市...',
    assetTypes: ['IMAGE', 'COVER'],
    roles: sceneRoles,
    defaultRole: 'scene_showroom',
  },
  {
    key: 'avatar',
    label: '数字人形象',
    hint: '图片 / 主播素材',
    description: '选择销售顾问或数字人图片后，会作为 host_image 参与生成。',
    placeholder: '搜索数字人、主播、销售顾问...',
    assetTypes: ['IMAGE', 'COVER'],
    roles: [{ value: 'host_image', label: '数字人图片' }],
    defaultRole: 'host_image',
  },
  {
    key: 'bgm',
    label: '背景音乐',
    hint: 'BGM / 口播音频',
    description: '可选择 BGM、口播音频或参考音频；音频策略仍由高级参数决定。',
    placeholder: '搜索 BGM、口播、参考音频...',
    assetTypes: ['AUDIO'],
    roles: [
      { value: 'bgm', label: 'BGM' },
      { value: 'voiceover', label: '口播音频' },
      { value: 'reference_audio', label: '参考音频' },
    ],
    defaultRole: 'bgm',
  },
  {
    key: 'script',
    label: '文案/分镜',
    hint: '脚本 / 模板 / 对标',
    description: '可选择口播文案、字幕、分镜 JSON 或对标解析结果作为生成上下文。',
    placeholder: '搜索文案、字幕、分镜、对标...',
    assetTypes: ['JSON', 'TEXT'],
    roles: [
      { value: 'voice_script', label: '口播文案' },
      { value: 'subtitle', label: '字幕文本' },
      { value: 'storyboard_json', label: '分镜 JSON' },
      { value: 'benchmark_json', label: '对标 JSON' },
    ],
    defaultRole: 'voice_script',
  },
  {
    key: 'video',
    label: '视频素材',
    hint: '素材 / 口播 / 参考',
    description: '可加入已有视频素材、数字人口播视频或参考视频。',
    placeholder: '搜索视频素材、口播视频、参考视频...',
    assetTypes: ['VIDEO'],
    roles: [
      { value: 'material_video', label: '视频素材' },
      { value: 'host_video', label: '口播视频' },
      { value: 'reference_video', label: '参考视频' },
    ],
    defaultRole: 'material_video',
  },
]

const activeCategoryKey = ref<CarSalesAssetCategoryKey>(props.initialCategory || 'carBundle')
const assets = ref<AssetItem[]>([])
const keyword = ref('')
const scope = ref<AssetListScope>('all')
const loading = ref(false)
const errorMessage = ref('')
const selectedRoleByAssetId = ref<Record<number, QuickRenderAssetRole>>({})
const previewByAssetId = ref<Record<number, CarBundlePreview>>({})
let previewLoadSeq = 0

const isLockedCategory = computed(() => Boolean(props.lockedCategory))
const visibleCategories = computed(() => {
  if (!props.lockedCategory) {
    return categories
  }
  return categories.filter((category) => category.key === props.lockedCategory)
})
const activeCategory = computed(() =>
  visibleCategories.value.find((category) => category.key === activeCategoryKey.value) ||
  visibleCategories.value[0] ||
  categories[0],
)
const drawerTitle = computed(() => (isLockedCategory.value ? '选择车型素材包' : '资产中心选择'))
const drawerDescription = computed(() =>
  isLockedCategory.value
    ? 'AI 智能创作沿用资产复用的车型素材包逻辑；选择一个车型素材包后，后续文案、分镜和车辆画面仍按既有生成链路编排。'
    : '按汽车销售成片常用素材分类选择，并在加入前确认素材角色。',
)

const filteredAssets = computed(() =>
  sortAssets(assets.value.filter((asset) => assetMatchesCategory(asset, activeCategory.value))),
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      activeCategoryKey.value = props.lockedCategory || props.initialCategory || activeCategoryKey.value
      syncScopeForCategory(activeCategoryKey.value)
      void loadAssets()
    }
  },
)

watch(
  () => props.initialCategory,
  (value) => {
    if (value && !props.lockedCategory) {
      activeCategoryKey.value = value
      syncScopeForCategory(value)
    }
  },
)

watch(
  () => props.lockedCategory,
  (value) => {
    if (value) {
      activeCategoryKey.value = value
      syncScopeForCategory(value)
    }
  },
)

function syncScopeForCategory(category: CarSalesAssetCategoryKey) {
  if (category === 'carBundle') {
    scope.value = 'all'
  }
}

async function loadAssets() {
  const seq = ++previewLoadSeq
  loading.value = true
  errorMessage.value = ''
  try {
    const lists = await Promise.all(
      activeCategory.value.assetTypes.map((assetType) =>
        getAssets({
          assetType,
          keyword: keyword.value,
          scope: scope.value,
          assetGroup: activeCategory.value.key === 'carBundle' ? '\u6c7d\u8f66\u7d20\u6750\u5305' : undefined,
          sort: 'createdAtDesc',
          pageNo: 1,
          pageSize: activeCategory.value.key === 'carBundle' ? 80 : 40,
        }),
      ),
    )
    assets.value = dedupeAssets(lists.flat())
    seedDefaultRoles()
    seedBundlePreviews()
    void hydrateBundlePreviews(seq)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
    assets.value = []
    previewByAssetId.value = {}
  } finally {
    loading.value = false
  }
}

function setCategory(key: CarSalesAssetCategoryKey) {
  if (props.lockedCategory) {
    return
  }
  if (activeCategoryKey.value === key) {
    return
  }
  activeCategoryKey.value = key
  syncScopeForCategory(key)
  keyword.value = ''
  void loadAssets()
}

function selectAsset(asset: AssetItem) {
  const role = selectedRoleByAssetId.value[asset.assetId] || roleForAsset(asset, activeCategory.value)
  emit('select', {
    asset: enrichAssetWithBundlePreview(asset),
    role,
    category: activeCategory.value.key,
  })
  close()
}

function close() {
  emit('update:modelValue', false)
}

function seedDefaultRoles() {
  const next = { ...selectedRoleByAssetId.value }
  for (const asset of assets.value) {
    next[asset.assetId] = next[asset.assetId] || roleForAsset(asset, activeCategory.value)
  }
  selectedRoleByAssetId.value = next
}

function roleForAsset(asset: AssetItem, category: AssetCategory): QuickRenderAssetRole {
  const inferred = normalizeRole(
    metadataText(asset, 'assetRole') ||
    metadataText(asset, 'role') ||
    inferRoleFromAsset(asset),
  )
  if (inferred && category.roles.some((role) => role.value === inferred)) {
    return inferred
  }
  return category.defaultRole
}

function assetMatchesCategory(asset: AssetItem, category: AssetCategory) {
  if (!category.assetTypes.includes(asset.assetType)) {
    return false
  }
  if (category.key === 'carBundle') {
    return isCarBundle(asset)
  }
  if (category.key === 'avatar') {
    return isAvatarAsset(asset) || asset.assetType === 'IMAGE' || asset.assetType === 'COVER'
  }
  return true
}

function inferRoleFromAsset(asset: AssetItem) {
  const name = `${asset.fileName || ''} ${asset.sourceType || ''} ${asset.metadataJson || ''}`.toLowerCase()
  if (isCarBundle(asset)) return 'car_model_bundle'
  if (name.includes('avatar') || name.includes('host') || name.includes('数字人') || name.includes('主播')) return 'host_image'
  if (name.includes('showroom') || name.includes('展厅')) return 'scene_showroom'
  if (name.includes('road') || name.includes('道路')) return 'scene_road'
  if (name.includes('night') || name.includes('夜景') || name.includes('门店')) return 'scene_night'
  if (name.includes('scene') || name.includes('场景') || name.includes('city') || name.includes('户外')) return 'scene_outdoor'
  if (name.includes('side') || name.includes('侧')) return 'car_exterior_side'
  if (name.includes('rear') || name.includes('尾')) return 'car_exterior_rear'
  if (name.includes('interior') || name.includes('内饰') || name.includes('dashboard')) return 'car_interior_dashboard'
  if (name.includes('wheel') || name.includes('轮')) return 'car_detail_wheel'
  if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
  if (name.includes('logo') || name.includes('标')) return 'car_detail_logo'
  if (asset.assetType === 'AUDIO') {
    if (name.includes('bgm') || name.includes('music') || name.includes('背景')) return 'bgm'
    if (name.includes('ref') || name.includes('reference')) return 'reference_audio'
    return 'voiceover'
  }
  if (asset.assetType === 'VIDEO') {
    if (name.includes('host') || name.includes('口播') || name.includes('主播')) return 'host_video'
    if (name.includes('ref') || name.includes('reference') || name.includes('对标')) return 'reference_video'
    return 'material_video'
  }
  if (asset.assetType === 'JSON') {
    if (name.includes('benchmark') || name.includes('对标')) return 'benchmark_json'
    if (name.includes('script') || name.includes('文案')) return 'voice_script'
    return 'storyboard_json'
  }
  if (asset.assetType === 'TEXT') {
    if (name.includes('subtitle') || name.includes('字幕')) return 'subtitle'
    return 'voice_script'
  }
  return 'car_exterior_front'
}

function normalizeRole(value: string | null | undefined): QuickRenderAssetRole | '' {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
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
    digital_human: 'host_image',
    reference: 'reference_video',
  }
  const role = aliases[normalized] || normalized
  return categories.some((category) => category.roles.some((option) => option.value === role))
    ? role as QuickRenderAssetRole
    : ''
}

function isCarBundle(asset: AssetItem) {
  const text = `${asset.fileName || ''} ${asset.metadataJson || ''}`.toLowerCase()
  return text.includes('car_model_bundle') ||
    text.includes('car-model-bundle') ||
    text.includes('车型素材包') ||
    (text.includes('car_model') && text.includes('bundle'))
}

function isAvatarAsset(asset: AssetItem) {
  const text = `${asset.fileName || ''} ${asset.sourceType || ''} ${asset.metadataJson || ''}`.toLowerCase()
  return text.includes('avatar') ||
    text.includes('host_image') ||
    text.includes('avatarname') ||
    text.includes('数字人') ||
    text.includes('主播')
}

function metadataText(asset: AssetItem, key: string) {
  const metadata = parseMetadata(asset.metadataJson)
  return metadataTextFromRecord(metadata, key)
}

function metadataTextFromRecord(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : ''
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) {
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

function seedBundlePreviews() {
  const next: Record<number, CarBundlePreview> = {}
  for (const asset of assets.value) {
    if (isCarBundle(asset)) {
      next[asset.assetId] = buildBundlePreviewFromMetadata(asset)
    }
  }
  previewByAssetId.value = next
}

async function hydrateBundlePreviews(seq: number) {
  if (activeCategory.value.key !== 'carBundle') {
    return
  }
  const targets = filteredAssets.value.filter((asset) => isCarBundle(asset) && !previewByAssetId.value[asset.assetId]?.images.length)
  let cursor = 0
  const workerCount = Math.min(10, targets.length)
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (seq === previewLoadSeq) {
      const asset = targets[cursor++]
      if (!asset) {
        return
      }
      try {
        const text = await getAssetTextContent(asset)
        if (seq !== previewLoadSeq) {
          return
        }
        previewByAssetId.value = {
          ...previewByAssetId.value,
          [asset.assetId]: buildBundlePreviewFromContent(asset, text),
        }
      } catch {
        // 保留 metadata 封面兜底，避免单个旧资产内容读取失败拖慢列表。
      }
    }
  }))
}

function buildBundlePreviewFromMetadata(asset: AssetItem): CarBundlePreview {
  const metadata = parseMetadata(asset.metadataJson)
  const cover = firstNonEmptyText(
    asset.thumbnailUrl || '',
    stringFromRecord(metadata, 'thumbnailUrl'),
    stringFromRecord(metadata, 'coverUrl'),
    stringFromRecord(metadata, 'coverImageUrl'),
    stringFromRecord(metadata, 'firstFrameUrl'),
  )
  const imageCount = numberFromRecord(metadata, 'imageCount') || numberFromRecord(metadata, 'componentCount')
  return {
    title: bundlePreviewTitle(asset, metadata),
    meta: bundlePreviewMeta(asset, imageCount),
    images: cover ? [resolveUrl(cover)] : [],
    imageCount,
  }
}

function buildBundlePreviewFromContent(asset: AssetItem, rawText: string): CarBundlePreview {
  const metadata = parseMetadata(asset.metadataJson)
  const parsed = parseMetadata(rawText)
  if (!parsed) {
    return buildBundlePreviewFromMetadata(asset)
  }
  const rawImages = bundleImageUrls(parsed)
  const images = rawImages.map(resolveUrl).filter(Boolean)
  const imageCount = images.length || numberFromRecord(metadata, 'imageCount') || numberFromRecord(metadata, 'componentCount')
  return {
    title: bundlePreviewTitle(asset, parsed),
    meta: bundlePreviewMeta(asset, imageCount),
    images: images.length ? images : buildBundlePreviewFromMetadata(asset).images,
    imageCount,
  }
}

function bundlePreviewTitle(asset: AssetItem, record: Record<string, unknown> | null) {
  const title = [
    firstNonEmptyText(
      stringFromRecord(record, 'brandModel'),
      stringFromRecord(record, 'title'),
      stringFromRecord(record, 'modelName'),
    ),
    stringFromRecord(record, 'color'),
  ].filter(Boolean).join(' · ')
  return title || asset.fileName
}

function bundlePreviewMeta(asset: AssetItem, imageCount: number) {
  return [
    imageCount > 0 ? `${imageCount} 张图片` : '',
    sourceTypeLabel(asset),
    formatDate(asset.createdAt),
  ].filter(Boolean).join(' · ')
}

function bundleImageUrls(record: Record<string, unknown>) {
  const rawImages = record.images
  if (!Array.isArray(rawImages)) {
    return []
  }
  const urls: string[] = []
  for (const item of rawImages) {
    if (!isRecord(item)) {
      continue
    }
    const url = firstNonEmptyText(
      stringFromRecord(item, 'url'),
      stringFromRecord(item, 'fileUrl'),
      stringFromRecord(item, 'imageUrl'),
      stringFromRecord(item, 'thumbnailUrl'),
      stringFromRecord(item, 'coverUrl'),
    )
    if (url) {
      urls.push(url)
    }
  }
  return Array.from(new Set(urls))
}

function assetPreview(asset: AssetItem) {
  return isCarBundle(asset) ? previewByAssetId.value[asset.assetId] : undefined
}

function assetPreviewImages(asset: AssetItem) {
  return assetPreview(asset)?.images || []
}

function assetPreviewImageCount(asset: AssetItem) {
  return assetPreview(asset)?.imageCount || assetPreviewImages(asset).length
}

function assetPreviewTitle(asset: AssetItem) {
  return assetPreview(asset)?.title || asset.fileName
}

function assetPreviewMeta(asset: AssetItem) {
  return assetPreview(asset)?.meta || `${asset.assetType} · ${sourceTypeLabel(asset)} · ${formatDate(asset.createdAt)}`
}

function enrichAssetWithBundlePreview(asset: AssetItem): AssetItem {
  const preview = assetPreview(asset)
  if (!preview?.images.length) {
    return asset
  }
  const metadata = parseMetadata(asset.metadataJson) || {}
  return {
    ...asset,
    thumbnailUrl: asset.thumbnailUrl || preview.images[0],
    metadataJson: JSON.stringify({
      ...metadata,
      coverUrl: stringFromRecord(metadata, 'coverUrl') || preview.images[0],
      thumbnailUrl: stringFromRecord(metadata, 'thumbnailUrl') || preview.images[0],
      imageCount: numberFromRecord(metadata, 'imageCount') || preview.imageCount,
      previewImages: preview.images.slice(0, 4),
    }),
  }
}

function firstNonEmptyText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) {
      return text
    }
  }
  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringFromRecord(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberFromRecord(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function dedupeAssets(list: AssetItem[]) {
  const seen = new Set<number>()
  return list.filter((asset) => {
    if (seen.has(asset.assetId)) {
      return false
    }
    seen.add(asset.assetId)
    return true
  })
}

function sortAssets(list: AssetItem[]) {
  return [...list].sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '') || b.assetId - a.assetId)
}

function assetPreviewImageUrl(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const coverUrl = asset.thumbnailUrl
    || metadataTextFromRecord(metadata, 'thumbnailUrl')
    || metadataTextFromRecord(metadata, 'coverUrl')
    || metadataTextFromRecord(metadata, 'firstFrameUrl')
  if (coverUrl) {
    return resolveUrl(coverUrl)
  }
  if (asset.assetType !== 'IMAGE' && asset.assetType !== 'COVER') {
    return ''
  }
  return resolveUrl(asset.fileUrl)
}

function assetVideoUrl(asset: AssetItem) {
  if (asset.assetType !== 'VIDEO') {
    return ''
  }
  return resolveUrl(asset.fileUrl)
}

function resolveUrl(url: string | null | undefined) {
  const raw = String(url || '').trim()
  if (!raw) {
    return ''
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw
  }
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function assetIcon(asset: AssetItem) {
  if (asset.assetType === 'AUDIO') return '音频'
  if (asset.assetType === 'VIDEO') return '视频'
  if (asset.assetType === 'JSON') return 'JSON'
  if (asset.assetType === 'TEXT') return '文案'
  return '素材'
}

function sourceTypeLabel(asset: AssetItem) {
  if (asset.sourceType === 'AVATAR_GENERATE') return '数字人'
  if (asset.sourceType === 'TTS_GENERATE') return '语音'
  if (asset.sourceType === 'DOUYIN_REWRITE') return '文案'
  if (asset.sourceType === 'VIDEO_SCRIPT_ANALYZE' || asset.sourceType === 'VIDEO_SCRIPT_URL_ANALYZE') return '分镜'
  return asset.sourceType || '资产'
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    return '-'
  }
  const pad = (n: number) => n < 10 ? `0${n}` : String(n)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
</script>

<style scoped>
.car-asset-backdrop {
  position: fixed;
  z-index: 2050;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.34);
}

.car-asset-drawer {
  display: flex;
  width: min(960px, 100vw);
  height: 100vh;
  flex-direction: column;
  background: #fff;
  box-shadow: -14px 0 36px rgba(15, 23, 42, 0.18);
}

.car-asset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid var(--hs-border);
  padding: 18px 20px;
}

.car-asset-head h2 {
  margin: 0;
  color: var(--hs-text);
  font-size: 18px;
  font-weight: 850;
}

.car-asset-head p {
  margin: 4px 0 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.car-asset-close {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text-muted);
  font-size: 20px;
}

.car-asset-layout {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 220px minmax(0, 1fr);
}

.car-asset-layout--single {
  grid-template-columns: minmax(0, 1fr);
}

.car-asset-nav {
  display: grid;
  align-content: start;
  gap: 8px;
  overflow-y: auto;
  border-right: 1px solid var(--hs-border);
  background: var(--hs-surface-muted);
  padding: 14px;
}

.car-asset-nav button {
  display: grid;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 11px 12px;
  text-align: left;
}

.car-asset-nav button.active {
  border-color: #bfdbfe;
  background: #fff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.car-asset-nav strong {
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
}

.car-asset-nav small {
  color: var(--hs-text-muted);
  font-size: 12px;
}

.car-asset-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 16px 18px;
}

.car-asset-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 8px;
}

.car-asset-toolbar input,
.car-asset-toolbar select,
.car-asset-button,
.car-asset-role select,
.car-asset-primary {
  min-height: 36px;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text);
  padding: 0 10px;
  font-weight: 750;
  outline: none;
}

.car-asset-button,
.car-asset-primary {
  cursor: pointer;
}

.car-asset-primary {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.car-asset-tip,
.car-asset-empty {
  margin: 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.car-asset-empty {
  border: 1px dashed var(--hs-border);
  border-radius: 8px;
  padding: 28px;
  text-align: center;
}

.car-asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}

.car-asset-card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}

.car-asset-preview {
  display: grid;
  aspect-ratio: 4 / 3;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #f1f5f9;
  color: var(--hs-text-muted);
  font-size: 13px;
  font-weight: 850;
  position: relative;
}

.car-asset-preview img,
.car-asset-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.car-asset-preview--bundle {
  display: block;
  background: #eaf2ff;
}

.car-asset-preview-main {
  display: block;
}

.car-asset-preview-strip {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  grid-template-columns: repeat(3, 28px);
  gap: 4px;
}

.car-asset-preview-strip img {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
  object-fit: cover;
}

.car-asset-preview-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
  padding: 5px 7px;
}

.car-asset-info {
  display: grid;
  gap: 4px;
}

.car-asset-info strong {
  overflow: hidden;
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-asset-info p,
.car-asset-role span {
  margin: 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.car-asset-role {
  display: grid;
  gap: 5px;
}

@media (max-width: 760px) {
  .car-asset-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .car-asset-nav {
    grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid var(--hs-border);
    padding: 10px;
  }

  .car-asset-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>

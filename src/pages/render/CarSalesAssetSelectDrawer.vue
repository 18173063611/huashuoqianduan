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
              <select v-if="scope !== 'private'" v-model="publicProvider" :disabled="loading" aria-label="公共来源">
                <option value="all">全部公共来源</option>
                <option value="developer">官方资产</option>
                <option value="user">用户公共</option>
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
              <article
                v-for="asset in filteredAssets"
                :key="asset.assetId"
                class="car-asset-card"
                :class="{ 'car-asset-card--match': isCurrentCarMatchedAsset(asset) }"
              >
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
                  <div class="car-asset-tags">
                    <small class="car-asset-provider-tag" :class="assetProviderTagClass(asset)">
                      {{ publicAssetProviderLabel(asset) }}
                    </small>
                    <small
                      v-for="badge in developerAssetFeatureBadges(asset)"
                      :key="badge"
                      class="car-asset-feature-tag"
                    >
                      {{ badge }}
                    </small>
                  </div>
                  <small v-if="currentCarMatchLabel(asset)" class="car-asset-match-tag">
                    {{ currentCarMatchLabel(asset) }}
                  </small>
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
import {
  CAR_MODEL_BUNDLE_GROUP,
  SCENE_MATERIAL_BUNDLE_GROUP,
  developerAssetFeatureBadges,
  normalizeAssetRole as normalizeWorkflowAssetRole,
  normalizedAssetRole as normalizedWorkflowAssetRole,
  publicAssetProviderKind,
  publicAssetProviderLabel,
} from '../../utils/assetWorkflow'

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
  currentCarModelAssetId?: number | string | null
  currentCarModelName?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [payload: CarSalesAssetSelectPayload]
}>()

const vehicleRoles: RoleOption[] = [
  { value: 'car_exterior_front', label: '车头外观' },
  { value: 'car_exterior_side', label: '车侧外观' },
  { value: 'car_exterior_rear', label: '车尾外观' },
  { value: 'car_exterior_45', label: '45度外观' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'car_interior_front_seat', label: '前排座椅' },
  { value: 'car_interior_back_seat', label: '后排座椅' },
  { value: 'car_interior_steering', label: '方向盘' },
  { value: 'car_interior_trunk', label: '后备箱' },
  { value: 'car_detail_sunroof', label: '天窗细节' },
  { value: 'car_detail_light', label: '车灯细节' },
  { value: 'car_detail_wheel', label: '轮毂细节' },
  { value: 'car_detail_logo', label: '车标细节' },
  { value: 'car_detail_seat_material', label: '座椅材质' },
]

const sceneRoles: RoleOption[] = [
  { value: 'scene_showroom', label: '场景图片' },
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
    hint: '单张背景图',
    description: '选择一张展厅、户外、道路或门店夜景图片作为本次视频背景参考。',
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
const publicProvider = ref<'all' | 'developer' | 'user'>('all')
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
  sortAssets(assets.value.filter(assetMatchesPublicProvider).filter((asset) => assetMatchesCategory(asset, activeCategory.value))),
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
  if (category === 'carBundle' || category === 'scene') {
    scope.value = 'all'
  }
}

async function loadAssets() {
  const seq = ++previewLoadSeq
  const category = activeCategory.value
  loading.value = true
  errorMessage.value = ''
  try {
    const assetGroup = assetGroupForCategory(category)
    const lists = await Promise.all(
      category.assetTypes.map((assetType) =>
        getAssets({
          assetType,
          keyword: keyword.value,
          scope: scope.value,
          assetGroup,
          sort: 'createdAtDesc',
          pageNo: 1,
          pageSize: category.key === 'carBundle' || category.key === 'scene' ? 80 : 40,
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

function assetGroupForCategory(category: AssetCategory) {
  if (category.key === 'carBundle') {
    return CAR_MODEL_BUNDLE_GROUP
  }
  if (category.key === 'scene') {
    return SCENE_MATERIAL_BUNDLE_GROUP
  }
  return undefined
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

function assetMatchesPublicProvider(asset: AssetItem) {
  if (publicProvider.value === 'all' || scope.value === 'private') {
    return true
  }
  if (String(asset.visibility || '').toUpperCase() !== 'PUBLIC') {
    return false
  }
  return publicAssetProviderKind(asset) === publicProvider.value
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
  const candidates = [
    metadataText(asset, 'assetRole') ||
      metadataText(asset, 'role'),
    normalizedWorkflowAssetRole(asset) ||
    inferRoleFromAsset(asset),
  ]
  for (const candidate of candidates) {
    const inferred = normalizeRole(candidate)
    if (inferred && category.roles.some((role) => role.value === inferred)) {
      return inferred
    }
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
  if (category.key === 'scene') {
    return isSceneImageAsset(asset)
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
  if (name.includes('side') || name.includes('侧面') || name.includes('车侧')) return 'car_exterior_side'
  if (name.includes('rear') || name.includes('back') || name.includes('尾部') || name.includes('车尾') || name.includes('背面')) return 'car_exterior_rear'
  if (name.includes('45')) return 'car_exterior_45'
  if (name.includes('dashboard') || name.includes('interior') || name.includes('内饰') || name.includes('中控') || name.includes('仪表')) return 'car_interior_dashboard'
  if (name.includes('front_seat') || name.includes('前排')) return 'car_interior_front_seat'
  if (name.includes('back_seat') || name.includes('rear_seat') || name.includes('后排')) return 'car_interior_back_seat'
  if (name.includes('steering') || name.includes('方向盘')) return 'car_interior_steering'
  if (name.includes('trunk') || name.includes('后备箱')) return 'car_interior_trunk'
  if (name.includes('sunroof') || name.includes('panoramic_roof') || name.includes('天窗') || name.includes('全景天幕')) return 'car_detail_sunroof'
  if (name.includes('wheel') || name.includes('轮毂') || name.includes('轮胎')) return 'car_detail_wheel'
  if (name.includes('logo') || name.includes('车标') || name.includes('标识')) return 'car_detail_logo'
  if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
  if (name.includes('seat') || name.includes('座椅') || name.includes('材质')) return 'car_detail_seat_material'
  if (name.includes('showroom') || name.includes('展厅') || name.includes('门店')) return 'scene_showroom'
  if (name.includes('road') || name.includes('highway') || name.includes('山路') || name.includes('公路') || name.includes('道路')) return 'scene_road'
  if (name.includes('night') || name.includes('夜景')) return 'scene_night'
  if (name.includes('scene') || name.includes('场景') || name.includes('city') || name.includes('户外')) return 'scene_outdoor'
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
  if (name.includes('front') || name.includes('car') || name.includes('车头') || name.includes('正面') || name.includes('外观')) return 'car_exterior_front'
  return 'car_exterior_front'
}

function normalizeRole(value: string | null | undefined): QuickRenderAssetRole | '' {
  const role = normalizeWorkflowAssetRole(value)
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

function isSceneImageAsset(asset: AssetItem) {
  if (!isImageLikeAsset(asset)) {
    return false
  }
  const group = String(asset.assetGroup || '').trim()
  if (group === SCENE_MATERIAL_BUNDLE_GROUP) {
    return true
  }
  const metadata = parseMetadata(asset.metadataJson)
  const explicitRole = normalizeWorkflowAssetRole(
    metadataTextFromRecord(metadata, 'assetRole') || metadataTextFromRecord(metadata, 'role'),
  )
  const metadataGroup = metadataTextFromRecord(metadata, 'assetGroup').trim()
  const bundleType = metadataTextFromRecord(metadata, 'bundleType').trim().toLowerCase()
  const from = metadataTextFromRecord(metadata, 'from').trim().toLowerCase()
  return (
    bundleType === 'scene_material' ||
    from === 'scene_material' ||
    from === 'scene_material_image' ||
    (explicitRole.startsWith('scene_') && metadataGroup === SCENE_MATERIAL_BUNDLE_GROUP)
  )
}

function isImageLikeAsset(asset: AssetItem) {
  const assetType = String(asset.assetType || '').trim().toUpperCase()
  const mimeType = String(asset.mimeType || '').trim().toLowerCase()
  return assetType === 'IMAGE' || assetType === 'COVER' || mimeType.startsWith('image/')
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
  return assetPreview(asset)?.title || assetDisplayName(asset) || asset.fileName
}

function assetDisplayName(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  return firstNonEmptyText(
    stringFromRecord(metadata, 'displayName'),
    stringFromRecord(metadata, 'assetDisplayName'),
    stringFromRecord(metadata, 'assetName'),
    stringFromRecord(metadata, 'sourceTitle'),
    stringFromRecord(metadata, 'title'),
    stringFromRecord(metadata, 'name'),
  )
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
  const currentId = normalizeAssetIdKey(props.currentCarModelAssetId)
  const currentName = normalizeMatchText(props.currentCarModelName || '')
  return [...list].sort((a, b) =>
    currentCarMatchScore(b, currentId, currentName) - currentCarMatchScore(a, currentId, currentName) ||
    Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '') ||
    b.assetId - a.assetId,
  )
}

function currentCarMatchScore(asset: AssetItem, currentId: string, currentName: string) {
  if (!isCurrentCarMatchedAsset(asset, currentId, currentName)) {
    return 0
  }
  const role = roleForAsset(asset, activeCategory.value)
  const contentBonus = role === 'voice_script' || role === 'storyboard_json' || role === 'benchmark_json' ? 20 : 0
  return 1000 + contentBonus
}

function isCurrentCarMatchedAsset(asset: AssetItem, currentId = normalizeAssetIdKey(props.currentCarModelAssetId), currentName = normalizeMatchText(props.currentCarModelName || '')) {
  if (!currentId && !currentName) {
    return false
  }
  const metadata = parseMetadata(asset.metadataJson)
  if (currentId && currentCarMetadataIds(asset, metadata).has(currentId)) {
    return true
  }
  if (!currentName) {
    return false
  }
  const metadataNames = [
    metadataTextFromRecord(metadata, 'carModelName'),
    metadataTextFromRecord(metadata, 'sourceCarModelName'),
    metadataTextFromRecord(metadata, 'vehicleName'),
    metadataTextFromRecord(metadata, 'brandModel'),
    metadataTextFromRecord(metadata, 'modelName'),
  ].map(normalizeMatchText).filter(Boolean)
  return metadataNames.some((name) => name === currentName)
}

function currentCarMatchLabel(asset: AssetItem) {
  if (!isCurrentCarMatchedAsset(asset)) {
    return ''
  }
  const metadata = parseMetadata(asset.metadataJson)
  const hostMode = metadataTextFromRecord(metadata, 'hostMode') || metadataTextFromRecord(metadata, 'digitalHumanMode')
  if (hostMode === 'digital_human' || hostMode === 'with_digital_human') {
    return '匹配当前车型 · 数字人版'
  }
  if (hostMode === 'no_digital_human' || hostMode === 'vehicle_only') {
    return '匹配当前车型 · 无数字人版'
  }
  return '匹配当前车型'
}

function assetProviderTagClass(asset: AssetItem) {
  const kind = publicAssetProviderKind(asset)
  return {
    'car-asset-provider-tag--developer': kind === 'developer',
    'car-asset-provider-tag--user': kind === 'user',
    'car-asset-provider-tag--private': kind === 'private',
  }
}

function currentCarMetadataIds(asset: AssetItem, metadata: Record<string, unknown> | null) {
  const ids = new Set<string>()
  const keys = [
    'carModelId',
    'sourceCarModelId',
    'sourceCarBundleAssetId',
    'carModelAssetId',
    'carBundleAssetId',
    'vehicleId',
    'bundleAssetId',
    'modelAssetId',
  ]
  for (const key of keys) {
    addAssetIdKey(ids, metadata?.[key])
  }
  addAssetIdKey(ids, metadata?.carModelIds)
  addAssetIdKey(ids, metadata?.sourceCarBundleAssetIds)
  addAssetIdKey(ids, metadata?.sourceAssetIds)
  addContentPairIdKeys(ids, metadataTextFromRecord(metadata, 'contentPairId'))
  addContentPairIdKeys(ids, `${asset.fileName || ''} ${asset.metadataJson || ''}`)
  return ids
}

function addAssetIdKey(target: Set<string>, value: unknown) {
  if (Array.isArray(value)) {
    value.forEach((item) => addAssetIdKey(target, item))
    return
  }
  const normalized = normalizeAssetIdKey(value)
  if (normalized) {
    target.add(normalized)
  }
}

function addContentPairIdKeys(target: Set<string>, value: string) {
  if (!value) {
    return
  }
  const matches = value.matchAll(/car_model_bundle:(\d+)/gi)
  for (const match of matches) {
    addAssetIdKey(target, match[1])
  }
}

function normalizeAssetIdKey(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }
  const text = String(value ?? '').trim()
  if (!text) {
    return ''
  }
  if (/^\d+$/.test(text)) {
    return text
  }
  const pair = text.match(/car_model_bundle:(\d+)/i)
  return pair?.[1] || ''
}

function normalizeMatchText(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·._-]+/g, '')
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

.car-asset-card--match {
  border-color: #86efac;
  background: #f0fdf4;
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

.car-asset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.car-asset-provider-tag,
.car-asset-feature-tag {
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 850;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-asset-provider-tag--developer {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #15803d;
}

.car-asset-provider-tag--user {
  border-color: #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.car-asset-provider-tag--private {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #64748b;
}

.car-asset-feature-tag {
  border-color: #d8b4fe;
  background: #faf5ff;
  color: #7e22ce;
}

.car-asset-match-tag {
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid #86efac;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 2px 8px;
  font-size: 11.5px;
  font-weight: 850;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
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

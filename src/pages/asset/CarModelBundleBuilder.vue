<template>
  <div class="car-bundle-backdrop" @click.self="emit('close')">
    <section class="car-bundle-modal" role="dialog" aria-modal="true" :aria-label="modalTitle">
      <header class="car-bundle-head">
        <div>
          <strong>{{ modalTitle }}</strong>
          <p>{{ modalDescription }}</p>
        </div>
        <button class="app-secondary-button" type="button" :disabled="saving" @click="emit('close')">关闭</button>
      </header>

      <div class="car-bundle-guidance">
        <strong>素材准备建议</strong>
        <span>优先补齐分镜会展示的部位。常用组合是正面、侧面、45 度角、中控台、前排和后排；已有图片可直接从资产中心加入，不需要重复上传。</span>
      </div>

      <div class="car-bundle-grid">
        <label class="car-bundle-field">
          <span>车型名称</span>
          <input v-model.trim="brandModel" :disabled="saving" placeholder="例如：吉利银河 L7" />
        </label>
        <label class="car-bundle-field">
          <span>颜色/版本</span>
          <input v-model.trim="color" :disabled="saving" placeholder="例如：白色 展厅版" />
        </label>
      </div>

      <div class="car-bundle-role-grid">
        <article
          v-for="role in carRoleOptions"
          :key="role.value"
          class="car-bundle-role"
          :class="{ 'car-bundle-role-selected': hasRoleSelection(role.value) }"
        >
          <div class="car-bundle-role-head">
            <span>{{ role.label }}</span>
            <button type="button" :disabled="saving" @click="openAssetPicker(role.value)">从资产中心选</button>
          </div>
          <img v-if="rolePreviewUrl(role.value)" :src="rolePreviewUrl(role.value)" alt="" />
          <input type="file" accept="image/*" :disabled="saving" @change="handleRoleFile(role.value, $event)" />
          <small>{{ roleSelectedName(role.value) }}</small>
          <button
            v-if="hasRoleSelection(role.value)"
            class="car-bundle-clear-role"
            type="button"
            :disabled="saving"
            @click="clearRole(role.value)"
          >
            移除
          </button>
        </article>
      </div>

      <section v-if="assetPickerRole" class="car-bundle-asset-picker" aria-label="从资产中心选择图片">
        <header>
          <div>
            <strong>选择{{ roleLabel(assetPickerRole) }}图片</strong>
            <small>可选公共图片和当前账号私有图片；选择后会写入车型素材包角色。</small>
          </div>
          <button class="app-secondary-button" type="button" @click="assetPickerRole = null">收起</button>
        </header>
        <div class="car-bundle-asset-tools">
          <input v-model.trim="assetKeyword" type="search" placeholder="搜索文件名、分组或来源..." />
          <button class="app-secondary-button" type="button" :disabled="assetLoading" @click="loadImageAssets">
            {{ assetLoading ? '加载中...' : '刷新图片' }}
          </button>
        </div>
        <p v-if="assetError" class="app-error">{{ assetError }}</p>
        <div v-else-if="assetLoading" class="car-bundle-asset-empty">正在加载资产中心图片...</div>
        <div v-else-if="filteredImageAssets.length === 0" class="car-bundle-asset-empty">暂无匹配图片</div>
        <div v-else class="car-bundle-asset-grid">
          <button
            v-for="asset in filteredImageAssets"
            :key="asset.assetId"
            type="button"
            class="car-bundle-asset-card"
            :class="{ active: selectedAssetIds.has(asset.assetId) }"
            @click="selectAssetForRole(asset)"
          >
            <img :src="resolveUrl(asset.thumbnailUrl || asset.fileUrl)" alt="" />
            <strong>{{ asset.fileName }}</strong>
            <small>{{ asset.assetGroup || sourceTypeLabel(asset.sourceType) }}</small>
          </button>
        </div>
      </section>

      <label class="car-bundle-field">
        <span>备注</span>
        <textarea v-model.trim="notes" :disabled="saving" rows="3" placeholder="可选：门店、拍摄环境、卖点提示" />
      </label>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <footer class="car-bundle-actions">
        <span>{{ selectedCount }} 张图片</span>
        <button class="app-primary-button" type="button" :disabled="saving || selectedCount === 0" @click="saveBundle">
          {{ saving ? '保存中...' : isEditing ? '保存更改' : '保存车型素材包' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getAssets, publishAsset, updateCarModelBundleAsset, uploadMaterialAsset } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem } from '../../types/assetTypes'

interface CarBundleImageItem {
  role?: string
  label?: string
  assetId?: number | null
  url?: string
  fileName?: string
  source?: string
}

interface CarModelBundlePayload {
  bundleType?: string
  assetRole?: string
  brandModel?: string
  color?: string
  notes?: string
  images?: CarBundleImageItem[]
  createdAt?: string
  updatedAt?: string
}

const props = defineProps<{
  publish?: boolean
  editingAsset?: AssetItem | null
  initialBundle?: CarModelBundlePayload | null
  initialAssets?: AssetItem[]
}>()

const emit = defineEmits<{
  close: []
  created: [asset: AssetItem]
  updated: [asset: AssetItem]
}>()

const carRoleOptions = [
  { value: 'car_exterior_front', label: '正面' },
  { value: 'car_exterior_side', label: '侧面' },
  { value: 'car_exterior_rear', label: '背面' },
  { value: 'car_exterior_45', label: '45 度角' },
  { value: 'car_interior_dashboard', label: '中控台' },
  { value: 'car_interior_front_seat', label: '前排' },
  { value: 'car_interior_back_seat', label: '后排' },
  { value: 'car_interior_steering', label: '方向盘/仪表' },
  { value: 'car_interior_trunk', label: '后备箱' },
  { value: 'car_detail_light', label: '车灯' },
  { value: 'car_detail_wheel', label: '轮毂' },
  { value: 'car_detail_logo', label: 'Logo' },
  { value: 'car_detail_seat_material', label: '座椅材质' },
] as const

const brandModel = ref('')
const color = ref('')
const notes = ref('')
const filesByRole = ref<Record<string, File>>({})
const fileNameByRole = ref<Record<string, string>>({})
const selectedAssetsByRole = ref<Record<string, AssetItem>>({})
const imageAssets = ref<AssetItem[]>([])
const assetPickerRole = ref<string | null>(null)
const assetKeyword = ref('')
const assetLoading = ref(false)
const assetError = ref('')
const saving = ref(false)
const errorMessage = ref('')

const isEditing = computed(() => Boolean(props.editingAsset))
const modalTitle = computed(() => (isEditing.value ? '编辑车型素材包' : '创建车型素材包'))
const modalDescription = computed(() =>
  isEditing.value
    ? '调整车型名称、备注和车辆部位图片，保存后视频生成页会使用最新素材包。'
    : '上传或从资产中心选择同一款车型的车辆部位图片，保存后可在视频生成页按分镜自动取用。',
)

const selectedCount = computed(() => {
  const roles = new Set([
    ...Object.keys(filesByRole.value),
    ...Object.keys(selectedAssetsByRole.value),
  ])
  return roles.size
})

const selectedAssetIds = computed(() =>
  new Set(
    Object.values(selectedAssetsByRole.value)
      .map((asset) => asset.assetId)
      .filter((assetId): assetId is number => Number.isFinite(assetId)),
  ),
)

const filteredImageAssets = computed(() => {
  const q = assetKeyword.value.trim().toLowerCase()
  if (!q) {
    return imageAssets.value
  }
  return imageAssets.value.filter((asset) =>
    [
      asset.fileName,
      asset.assetGroup,
      asset.sourceType,
      sourceTypeLabel(asset.sourceType),
      asset.metadataJson,
    ].some((value) => String(value || '').toLowerCase().includes(q)),
  )
})

onMounted(() => {
  void loadImageAssets()
})

watch(
  () => props.initialBundle,
  (bundle) => {
    hydrateInitialBundle(bundle)
  },
  { immediate: true },
)

watch(
  () => props.initialAssets,
  (assets) => {
    hydrateInitialAssets(assets)
  },
  { immediate: true },
)

function hydrateInitialBundle(bundle: CarModelBundlePayload | null | undefined) {
  if (!bundle) {
    return
  }
  brandModel.value = bundle.brandModel || ''
  color.value = bundle.color || ''
  notes.value = bundle.notes || ''
  filesByRole.value = {}
  fileNameByRole.value = {}
  const nextAssets: Record<string, AssetItem> = {}
  for (const item of Array.isArray(bundle.images) ? bundle.images : []) {
    const role = String(item.role || '').trim()
    const url = String(item.url || '').trim()
    if (!role || !url) {
      continue
    }
    nextAssets[role] = bundleImageToAsset(item, role)
  }
  selectedAssetsByRole.value = nextAssets
}

function hydrateInitialAssets(assets: AssetItem[] | null | undefined) {
  if (!assets?.length) {
    return
  }
  const nextAssets = { ...selectedAssetsByRole.value }
  for (const asset of assets) {
    if (!asset || !isImageAsset(asset)) {
      continue
    }
    const role = preferredRoleForAsset(asset, nextAssets)
    nextAssets[role] = asset
  }
  selectedAssetsByRole.value = nextAssets
}

function isImageAsset(asset: AssetItem) {
  return asset.assetType === 'IMAGE' || asset.assetType === 'COVER' || String(asset.mimeType || '').startsWith('image/')
}

function handleRoleFile(role: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }
  filesByRole.value = { ...filesByRole.value, [role]: file }
  fileNameByRole.value = { ...fileNameByRole.value, [role]: file.name }
  const nextAssets = { ...selectedAssetsByRole.value }
  delete nextAssets[role]
  selectedAssetsByRole.value = nextAssets
}

async function loadImageAssets() {
  assetLoading.value = true
  assetError.value = ''
  try {
    imageAssets.value = await getAssets({
      scope: 'all',
      assetType: 'IMAGE',
      sort: 'createdAtDesc',
    })
  } catch (error) {
    assetError.value = error instanceof Error ? error.message : '资产中心图片加载失败'
  } finally {
    assetLoading.value = false
  }
}

function openAssetPicker(role: string) {
  assetPickerRole.value = role
  assetError.value = ''
  if (!imageAssets.value.length) {
    void loadImageAssets()
  }
}

function selectAssetForRole(asset: AssetItem) {
  if (!assetPickerRole.value) {
    return
  }
  const role = assetPickerRole.value
  selectedAssetsByRole.value = {
    ...selectedAssetsByRole.value,
    [role]: asset,
  }
  const nextFiles = { ...filesByRole.value }
  const nextNames = { ...fileNameByRole.value }
  delete nextFiles[role]
  delete nextNames[role]
  filesByRole.value = nextFiles
  fileNameByRole.value = nextNames
  assetPickerRole.value = null
}

function clearRole(role: string) {
  const nextFiles = { ...filesByRole.value }
  const nextNames = { ...fileNameByRole.value }
  const nextAssets = { ...selectedAssetsByRole.value }
  delete nextFiles[role]
  delete nextNames[role]
  delete nextAssets[role]
  filesByRole.value = nextFiles
  fileNameByRole.value = nextNames
  selectedAssetsByRole.value = nextAssets
}

function hasRoleSelection(role: string) {
  return Boolean(filesByRole.value[role] || selectedAssetsByRole.value[role])
}

function roleSelectedName(role: string) {
  return fileNameByRole.value[role] || selectedAssetsByRole.value[role]?.fileName || '未选择'
}

function rolePreviewUrl(role: string) {
  const asset = selectedAssetsByRole.value[role]
  return asset ? resolveUrl(asset.thumbnailUrl || asset.fileUrl) : ''
}

function roleLabel(role: string | null) {
  return carRoleOptions.find((item) => item.value === role)?.label || '车型'
}

function preferredRoleForAsset(asset: AssetItem, selected: Record<string, AssetItem>) {
  const declaredRole = roleFromMetadata(asset)
  if (declaredRole) {
    return declaredRole
  }
  const inferredRole = inferRoleFromAssetName(asset.fileName)
  if (inferredRole && !selected[inferredRole]) {
    return inferredRole
  }
  return carRoleOptions.find((item) => !selected[item.value])?.value || carRoleOptions[0].value
}

function roleFromMetadata(asset: AssetItem) {
  const metadata = parseJsonObject(asset.metadataJson)
  const role = typeof metadata?.assetRole === 'string' ? metadata.assetRole : ''
  return carRoleOptions.some((item) => item.value === role) ? role : ''
}

function inferRoleFromAssetName(fileName: string) {
  const text = fileName.toLowerCase()
  const roleMatchers: Array<[string, RegExp]> = [
    ['car_exterior_front', /front|正面|车头|前脸/],
    ['car_exterior_side', /side|侧面|侧身/],
    ['car_exterior_rear', /rear|back|背面|尾部|车尾/],
    ['car_exterior_45', /45|斜侧|前侧/],
    ['car_interior_dashboard', /dashboard|cockpit|中控|座舱/],
    ['car_interior_front_seat', /front[-_ ]?seat|前排/],
    ['car_interior_back_seat', /back[-_ ]?seat|rear[-_ ]?seat|后排/],
    ['car_interior_steering', /steering|wheel|方向盘|仪表/],
    ['car_interior_trunk', /trunk|后备箱/],
    ['car_detail_light', /light|lamp|车灯|大灯/],
    ['car_detail_wheel', /tire|tyre|rim|轮毂|车轮/],
    ['car_detail_logo', /logo|标识|车标/],
    ['car_detail_seat_material', /seat|座椅|材质|皮质/],
  ]
  return roleMatchers.find(([, matcher]) => matcher.test(text))?.[0] || ''
}

async function saveBundle() {
  if (selectedCount.value === 0) {
    errorMessage.value = '请至少上传一张车型图片'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const imageItems: CarBundleImageItem[] = []
    for (const role of carRoleOptions) {
      const file = filesByRole.value[role.value]
      if (file) {
        const asset = await uploadMaterialAsset(file, {
          publish: props.publish,
          metadataJson: JSON.stringify({
            from: 'car_model_bundle_image',
            assetRole: role.value,
            assetGroup: '汽车素材包',
            brandModel: brandModel.value,
            color: color.value,
          }),
        })
        imageItems.push({
          role: role.value,
          label: role.label,
          assetId: asset.assetId,
          url: asset.fileUrl,
          fileName: asset.fileName,
          source: 'uploaded',
        })
        continue
      }
      const selectedAsset = selectedAssetsByRole.value[role.value]
      if (selectedAsset) {
        const shouldPublishSelected =
          selectedAsset.assetId > 0 &&
          props.publish &&
          String(selectedAsset.visibility || '').toUpperCase() !== 'PUBLIC'
        const asset = shouldPublishSelected
          ? await publishAsset(selectedAsset.assetId)
          : selectedAsset
        imageItems.push({
          role: role.value,
          label: role.label,
          assetId: asset.assetId > 0 ? asset.assetId : undefined,
          url: asset.fileUrl,
          fileName: asset.fileName,
          source: 'asset_center',
        })
      }
    }
    const payload = {
      bundleType: 'car_model',
      assetRole: 'car_model_bundle',
      brandModel: brandModel.value,
      color: color.value,
      notes: notes.value,
      images: imageItems,
      createdAt: props.initialBundle?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const safeName = (brandModel.value || '车型素材包').replace(/[\\/:*?"<>|]+/g, '_')
    const fileName = `${safeName}-车型素材包.json`
    const contentJson = JSON.stringify(payload, null, 2)
    const metadataJson = JSON.stringify({
      from: 'car_model_bundle',
      assetRole: 'car_model_bundle',
      assetGroup: '汽车素材包',
      bundleType: 'car_model',
      brandModel: brandModel.value,
      color: color.value,
    })
    if (props.editingAsset) {
      const bundleAsset = await updateCarModelBundleAsset(props.editingAsset.assetId, {
        fileName,
        contentJson,
        metadataJson,
      })
      emit('updated', bundleAsset)
      return
    }
    const file = new File([contentJson], fileName, {
      type: 'application/json',
    })
    const bundleAsset = await uploadMaterialAsset(file, {
      publish: props.publish,
      metadataJson,
    })
    emit('created', bundleAsset)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '车型素材包保存失败'
  } finally {
    saving.value = false
  }
}

function bundleImageToAsset(item: CarBundleImageItem, role: string): AssetItem {
  const assetId = typeof item.assetId === 'number' && Number.isFinite(item.assetId) ? item.assetId : 0
  const fileName = item.fileName || roleLabel(role)
  return {
    assetId,
    ownerUserId: null,
    createdByUserId: null,
    projectId: null,
    taskId: null,
    assetType: 'IMAGE',
    kind: 'MATERIAL',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    publishedAt: null,
    fileName,
    filePath: null,
    fileUrl: item.url || '',
    thumbnailUrl: item.url || null,
    mimeType: null,
    fileSize: 0,
    sourceType: item.source || 'USER_UPLOAD',
    assetGroup: '汽车素材包',
    metadataJson: null,
    createdAt: '',
    updatedAt: '',
  }
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  const key = String(sourceType || '').trim().toUpperCase()
  const labels: Record<string, string> = {
    USER_UPLOAD: '上传素材',
    AI_GENERATED: 'AI生成',
    AVATAR_GENERATE: '数字人形象',
    SEEDANCE_TEXT_VIDEO: '文生视频',
    SEEDANCE_FIRST_FRAME_VIDEO: '图生视频',
    SEEDANCE_FIRST_LAST_FRAME_VIDEO: '图生视频',
    SEEDANCE_REFERENCE_VIDEO: '图生视频',
    SEEDANCE_CAR_SALES_VIDEO: '汽车销售成片',
  }
  return labels[key] || key || '未知来源'
}

function resolveUrl(url: string | null | undefined) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
</script>

<style scoped>
.car-bundle-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 24px;
}

.car-bundle-modal {
  display: grid;
  width: min(960px, 100%);
  max-height: min(86vh, 860px);
  overflow: auto;
  gap: 16px;
  border-radius: 12px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
}

.car-bundle-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.car-bundle-head strong {
  display: block;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.car-bundle-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}

.car-bundle-guidance {
  display: grid;
  gap: 5px;
  border: 1px solid #d8d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 12px;
}

.car-bundle-guidance strong {
  color: #5541d7;
  font-size: 13px;
  font-weight: 900;
}

.car-bundle-guidance span {
  color: #4f586c;
  font-size: 12.5px;
  line-height: 1.6;
}

.car-bundle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.car-bundle-field {
  display: grid;
  gap: 6px;
}

.car-bundle-field span,
.car-bundle-role-head span {
  color: #344054;
  font-size: 12.5px;
  font-weight: 850;
}

.car-bundle-field input,
.car-bundle-field textarea {
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  color: #111827;
  padding: 10px 12px;
  outline: none;
}

.car-bundle-role-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.car-bundle-role {
  display: grid;
  gap: 7px;
  border: 1px dashed #d8d2ff;
  border-radius: 10px;
  background: #fbfaff;
  padding: 10px;
}

.car-bundle-role-selected {
  border-style: solid;
  border-color: #7c6bff;
  background: #f8f7ff;
}

.car-bundle-role-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.car-bundle-role-head button,
.car-bundle-clear-role {
  border: 1px solid #d8d2ff;
  border-radius: 7px;
  background: #fff;
  color: #5541d7;
  padding: 5px 8px;
  font-size: 11.5px;
  font-weight: 850;
  cursor: pointer;
}

.car-bundle-clear-role {
  width: fit-content;
  border-color: #fecaca;
  color: #dc2626;
}

.car-bundle-role img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  object-fit: cover;
}

.car-bundle-role input {
  width: 100%;
  color: #667085;
  font-size: 12px;
}

.car-bundle-role small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-bundle-asset-picker {
  display: grid;
  gap: 12px;
  border: 1px solid #e3e7f0;
  border-radius: 10px;
  background: #fcfdff;
  padding: 14px;
}

.car-bundle-asset-picker header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.car-bundle-asset-picker header strong {
  display: block;
  color: #111827;
  font-size: 14px;
  font-weight: 900;
}

.car-bundle-asset-picker header small {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.car-bundle-asset-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.car-bundle-asset-tools input {
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  padding: 9px 11px;
  outline: none;
}

.car-bundle-asset-empty {
  display: grid;
  min-height: 100px;
  place-items: center;
  border: 1px dashed #dbe1ec;
  border-radius: 8px;
  color: #667085;
  font-size: 13px;
}

.car-bundle-asset-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  max-height: 320px;
  overflow: auto;
  padding-right: 2px;
}

.car-bundle-asset-card {
  display: grid;
  gap: 6px;
  border: 1px solid #e5e9f2;
  border-radius: 9px;
  background: #fff;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.car-bundle-asset-card.active {
  border-color: #7c6bff;
  box-shadow: 0 0 0 2px rgba(124, 107, 255, 0.14);
}

.car-bundle-asset-card img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 7px;
  object-fit: cover;
  background: #eef2f8;
}

.car-bundle-asset-card strong,
.car-bundle-asset-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-bundle-asset-card strong {
  color: #232838;
  font-size: 12px;
}

.car-bundle-asset-card small {
  color: #667085;
  font-size: 11.5px;
}

.car-bundle-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #edf0f6;
  padding-top: 14px;
}

.car-bundle-actions span {
  color: #667085;
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .car-bundle-grid,
  .car-bundle-role-grid,
  .car-bundle-asset-tools,
  .car-bundle-asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <section class="pet-material-picker">
    <header class="pet-material-picker-head">
      <div>
        <h3>宠物生产素材</h3>
        <p>按宠物视频生产角色管理素材：主宠物、第二或更多宠物、产品/道具、背景/场景和口播/BGM 音频均写入宠物草稿。</p>
      </div>
      <button type="button" @click="loadAssets">{{ loadingAssets ? '加载中' : '刷新资产' }}</button>
    </header>

    <div class="pet-material-slots">
      <article
        v-for="slot in materialSlots"
        :key="slot.role"
        class="pet-material-slot"
        :class="{ active: slot.role === activeRole }"
      >
        <button type="button" class="pet-material-preview" @click="setActiveRole(slot.role)">
          <img
            v-if="slot.kind === 'image' && materialByRole[slot.role]?.url"
            :src="materialByRole[slot.role]?.url"
            :alt="slot.label"
          />
          <span v-else>{{ slot.shortLabel }}</span>
        </button>
        <div>
          <strong>{{ slot.label }}</strong>
          <p>{{ materialByRole[slot.role]?.label || slot.hint }}</p>
        </div>
        <button
          v-if="materialByRole[slot.role]"
          class="pet-material-remove"
          type="button"
          @click="removeMaterial(slot.role)"
        >
          移除
        </button>
      </article>
    </div>

    <div class="pet-material-actions">
      <label class="pet-upload-action" :class="{ disabled: uploading }">
        <input type="file" :accept="activeSlot.accept" :disabled="uploading" @change="handleUploadChange" />
        <span>{{ uploading ? '上传中...' : `上传${activeSlotLabel}` }}</span>
      </label>
      <div class="pet-url-action">
        <input v-model.trim="manualUrl" :placeholder="activeSlot.urlPlaceholder" />
        <button type="button" @click="addManualUrl">添加 URL</button>
      </div>
    </div>

    <p v-if="errorMessage" class="pet-material-error">{{ errorMessage }}</p>

    <div class="pet-asset-toolbar">
      <input
        v-model.trim="keyword"
        :disabled="loadingAssets"
        :placeholder="activeSlot.placeholder"
        @keydown.enter.prevent="loadAssets"
      />
      <select v-model="scope" :disabled="loadingAssets">
        <option value="private">私有素材</option>
        <option value="global">公共素材</option>
        <option value="all">全部素材</option>
      </select>
      <button type="button" :disabled="loadingAssets" @click="loadAssets">搜索</button>
    </div>

    <p class="pet-material-tip">{{ activeSlot.description }}</p>

    <div v-if="loadingAssets" class="pet-asset-empty">正在加载宠物资产中心素材。</div>
    <div v-else-if="assetOptions.length === 0" class="pet-asset-empty">
      当前分类暂无可选素材，可先上传文件或粘贴 URL。
    </div>
    <div v-else class="pet-asset-grid">
      <article v-for="asset in assetOptions" :key="asset.assetId" class="pet-asset-card">
        <div class="pet-asset-preview-box">
          <img v-if="assetPreviewUrl(asset)" :src="assetPreviewUrl(asset)" :alt="asset.fileName" />
          <span v-else>{{ assetKindLabel(asset) }}</span>
        </div>
        <strong>{{ asset.fileName }}</strong>
        <small>{{ assetSubtitle(asset) }}</small>
        <button
          type="button"
          class="pet-asset-select-button"
          :class="{ selected: isSelectedAsset(asset) }"
          @click="selectAsset(asset)"
        >
          {{ isSelectedAsset(asset) ? `已加入${activeSlotLabel}` : `加入${activeSlotLabel}` }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getAssets, uploadMaterialAsset, type AssetListScope } from '../../../services/assetApi'
import { normalizePublicMediaUrl } from '../../../utils/mediaUrl'
import type { AssetItem, AssetType } from '../../../types/assetTypes'
import type { PetReferenceMaterial } from '../petCreationTypes'

type PetMaterialRole = PetReferenceMaterial['role']

interface PetMaterialSlot {
  role: PetMaterialRole
  label: string
  shortLabel: string
  hint: string
  description: string
  placeholder: string
  urlPlaceholder: string
  assetTypes: AssetType[]
  accept: string
  kind: 'image' | 'audio'
  assetGroup: string
  metadataRole: string
}

const props = defineProps<{
  modelValue: PetReferenceMaterial[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PetReferenceMaterial[]]
  change: [value: PetReferenceMaterial[], material: PetReferenceMaterial | null]
}>()

const materialSlots: PetMaterialSlot[] = [
  {
    role: 'main_pet',
    label: '主宠物参考',
    shortLabel: '主宠',
    hint: '必填，建议正面清晰照',
    description: '主宠物参考图是身份锚点，市场同类产品也通常要求清晰、无遮挡、面部可见的宠物照片。',
    placeholder: '搜索主宠物、猫、狗、正面照...',
    urlPlaceholder: '粘贴主宠物图片 URL',
    assetTypes: ['IMAGE', 'COVER'],
    accept: 'image/*',
    kind: 'image',
    assetGroup: '主宠物候选',
    metadataRole: 'main_pet',
  },
  {
    role: 'second_pet',
    label: '第二/更多宠物参考',
    shortLabel: '副宠',
    hint: '可选，用于多宠物对话',
    description: '多宠物对话、合作短剧和互相吐槽模板建议补充第二或更多宠物参考图，避免角色漂移。',
    placeholder: '搜索第二只宠物、更多宠物、搭档...',
    urlPlaceholder: '粘贴第二或更多宠物图片 URL',
    assetTypes: ['IMAGE', 'COVER'],
    accept: 'image/*',
    kind: 'image',
    assetGroup: '第二宠物候选',
    metadataRole: 'second_pet',
  },
  {
    role: 'prop',
    label: '产品/道具参考',
    shortLabel: '产品',
    hint: '可选，宠物用品、零食、玩具、梳毛工具等',
    description: '产品图会以 prop 素材传入真实接口，只作为宠物用品或道具展示，不能替换主宠物身份。',
    placeholder: '搜索宠物用品、零食、玩具、道具...',
    urlPlaceholder: '粘贴产品/道具图片 URL',
    assetTypes: ['IMAGE', 'COVER'],
    accept: 'image/*',
    kind: 'image',
    assetGroup: '宠物产品/道具',
    metadataRole: 'prop',
  },
  {
    role: 'scene',
    label: '背景/场景参考',
    shortLabel: '背景',
    hint: '可选，客厅、草地、宠物店、咖啡店等',
    description: '背景图只作为场景参考，配合“背景图/场景要求”使用，不能覆盖宠物外观、毛色和脸型。',
    placeholder: '搜索客厅、草地、宠物店、背景...',
    urlPlaceholder: '粘贴背景/场景图片 URL',
    assetTypes: ['IMAGE', 'COVER'],
    accept: 'image/*',
    kind: 'image',
    assetGroup: '场景参考',
    metadataRole: 'scene',
  },
  {
    role: 'audio',
    label: '口播/BGM 音频',
    shortLabel: '音频',
    hint: '可选，口播、参考音频或 BGM，最多 1 条',
    description: '音频素材会以 audio 角色传入宠物任务；开启配音时作为口播参考，开启 BGM 时作为背景音乐参考。',
    placeholder: '搜索宠物口播、BGM、配音、参考音频...',
    urlPlaceholder: '粘贴音频 URL，支持 mp3 / wav / m4a',
    assetTypes: ['AUDIO'],
    accept: 'audio/*',
    kind: 'audio',
    assetGroup: '宠物音频',
    metadataRole: 'audio',
  },
]

const activeRole = ref<PetMaterialRole>('main_pet')
const keyword = ref('')
const scope = ref<AssetListScope>('all')
const manualUrl = ref('')
const loadingAssets = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const assetOptions = ref<AssetItem[]>([])

const activeSlot = computed(() => materialSlots.find((slot) => slot.role === activeRole.value) || materialSlots[0])
const activeSlotLabel = computed(() => activeSlot.value.label)

const materialByRole = computed(() =>
  props.modelValue.reduce<Partial<Record<PetMaterialRole, PetReferenceMaterial>>>((map, material) => {
    map[material.role] = material
    return map
  }, {}),
)

function setActiveRole(role: PetMaterialRole) {
  if (activeRole.value === role) return
  activeRole.value = role
  manualUrl.value = ''
  errorMessage.value = ''
}

function assetUrl(asset: AssetItem) {
  return normalizePublicMediaUrl(asset.fileUrl || asset.thumbnailUrl || '')
}

function assetPreviewUrl(asset: AssetItem) {
  if (activeSlot.value.kind === 'audio') return ''
  return normalizePublicMediaUrl(asset.thumbnailUrl || asset.fileUrl || '')
}

function assetKindLabel(asset: AssetItem) {
  if (asset.assetType === 'AUDIO') return '音频'
  if (asset.assetType === 'TEXT') return '文案'
  if (asset.assetType === 'JSON') return 'JSON'
  return '素材'
}

function assetSubtitle(asset: AssetItem) {
  const sizeKb = asset.fileSize > 0 ? `${Math.ceil(asset.fileSize / 1024)}KB` : '未知大小'
  return `${asset.sourceType || '素材'} · ${asset.assetType} · ${sizeKb}`
}

function upsertMaterial(material: PetReferenceMaterial) {
  const next = props.modelValue.filter((item) => item.role !== material.role)
  const nextMaterials = [...next, material]
  emit('update:modelValue', nextMaterials)
  emit('change', nextMaterials, material)
}

function removeMaterial(role: PetMaterialRole) {
  const nextMaterials = props.modelValue.filter((item) => item.role !== role)
  emit('update:modelValue', nextMaterials)
  emit('change', nextMaterials, null)
}

function isSelectedAsset(asset: AssetItem) {
  return materialByRole.value[activeRole.value]?.assetId === String(asset.assetId)
}

function selectAsset(asset: AssetItem) {
  const url = assetUrl(asset)
  if (!url && !asset.assetId) {
    errorMessage.value = '该素材缺少可用 URL'
    return
  }
  upsertMaterial({
    id: `asset-${asset.assetId}-${activeRole.value}`,
    role: activeRole.value,
    assetId: String(asset.assetId),
    url,
    label: asset.fileName || activeSlotLabel.value,
  })
  errorMessage.value = ''
}

function addManualUrl() {
  const url = normalizePublicMediaUrl(manualUrl.value)
  if (!url) {
    errorMessage.value = activeSlot.value.kind === 'audio' ? '请先输入音频 URL' : '请先输入图片 URL'
    return
  }
  upsertMaterial({
    id: `url-${activeRole.value}-${Date.now()}`,
    role: activeRole.value,
    url,
    label: `${activeSlotLabel.value} URL 参考`,
  })
  manualUrl.value = ''
  errorMessage.value = ''
}

function uploadMetadata() {
  return JSON.stringify({
    businessDomain: 'pet',
    domain: 'pet_creation',
    assetGroup: activeSlot.value.assetGroup,
    assetRole: activeSlot.value.metadataRole,
    materialRole: activeRole.value,
  })
}

async function handleUploadChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (activeSlot.value.kind === 'audio' && !file.type.startsWith('audio/')) {
    errorMessage.value = '当前槽位只支持上传音频文件'
    return
  }
  if (activeSlot.value.kind === 'image' && !file.type.startsWith('image/')) {
    errorMessage.value = '当前槽位只支持上传图片文件'
    return
  }
  uploading.value = true
  errorMessage.value = ''
  try {
    const asset = await uploadMaterialAsset(file, {
      businessDomain: 'pet',
      metadataJson: uploadMetadata(),
    })
    selectAsset(asset)
    await loadAssets()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '上传宠物素材失败'
  } finally {
    uploading.value = false
  }
}

function dedupeAssets(list: AssetItem[]) {
  const seen = new Set<number>()
  return list.filter((asset) => {
    if (seen.has(asset.assetId)) return false
    seen.add(asset.assetId)
    return true
  })
}

async function loadAssets() {
  loadingAssets.value = true
  errorMessage.value = ''
  const slot = activeSlot.value
  try {
    const lists = await Promise.all(
      slot.assetTypes.map((assetType) =>
        getAssets({
          assetType,
          keyword: keyword.value,
          scope: scope.value,
          pageNo: 1,
          pageSize: 24,
          businessDomain: 'pet',
          assetGroup: slot.assetGroup,
        }),
      ),
    )
    assetOptions.value = dedupeAssets(lists.flat())
  } catch (error) {
    assetOptions.value = []
    errorMessage.value = error instanceof Error ? error.message : '宠物资产加载失败'
  } finally {
    loadingAssets.value = false
  }
}

watch(activeRole, () => {
  void loadAssets()
})

onMounted(() => {
  void loadAssets()
})
</script>

<style scoped>
.pet-material-picker,
.pet-material-slot,
.pet-asset-card {
  display: grid;
  gap: 12px;
}

.pet-material-picker {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-material-picker-head,
.pet-material-actions,
.pet-asset-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pet-material-picker-head {
  justify-content: space-between;
}

.pet-material-picker-head h3 {
  margin: 0 0 6px;
  color: #172033;
  font-size: 17px;
  font-weight: 900;
}

.pet-material-picker-head p,
.pet-material-slot p,
.pet-asset-card small,
.pet-asset-empty,
.pet-material-tip {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.55;
}

.pet-material-picker button,
.pet-upload-action span {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-asset-select-button.selected {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.pet-material-slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.pet-material-slot {
  position: relative;
  grid-template-columns: 56px 1fr;
  align-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.pet-material-slot.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.pet-material-preview {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 !important;
}

.pet-material-preview img,
.pet-asset-preview-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pet-material-slot strong,
.pet-asset-card strong {
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-material-remove {
  position: absolute;
  right: 8px;
  bottom: 8px;
  min-height: 26px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
}

.pet-upload-action {
  display: inline-flex;
  cursor: pointer;
}

.pet-upload-action.disabled {
  cursor: wait;
  opacity: 0.66;
}

.pet-upload-action input {
  display: none;
}

.pet-url-action,
.pet-asset-toolbar {
  display: flex;
  flex: 1 1 auto;
  gap: 8px;
}

.pet-url-action input,
.pet-asset-toolbar input,
.pet-asset-toolbar select {
  min-height: 36px;
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 12px;
  font-size: 13px;
}

.pet-url-action input,
.pet-asset-toolbar input {
  flex: 1 1 auto;
}

.pet-material-error {
  margin: 0;
  border-radius: 8px;
  background: #fff1f2;
  color: #be123c;
  padding: 10px 12px;
  font-size: 13px;
}

.pet-material-tip {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 9px 11px;
}

.pet-asset-empty {
  border: 1px dashed #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 18px;
  text-align: center;
}

.pet-asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.pet-asset-card {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.pet-asset-preview-box {
  display: grid;
  width: 100%;
  aspect-ratio: 16 / 10;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #eef4ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

@media (max-width: 760px) {
  .pet-material-picker-head,
  .pet-material-actions,
  .pet-asset-toolbar,
  .pet-url-action {
    align-items: stretch;
    flex-direction: column;
  }

  .pet-material-picker button,
  .pet-upload-action span {
    width: 100%;
  }
}
</style>

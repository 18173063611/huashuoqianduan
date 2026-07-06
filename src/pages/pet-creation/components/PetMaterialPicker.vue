<template>
  <section class="pet-material-picker">
    <header class="pet-material-picker-head">
      <div>
        <h3>宠物素材包</h3>
        <p>为主宠物、第二只宠物、道具和背景场景分别补充参考图，生成时会写入宠物草稿材料列表。</p>
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
        <button type="button" @click="activeRole = slot.role">
          <img v-if="materialByRole[slot.role]?.url" :src="materialByRole[slot.role]?.url" :alt="slot.label" />
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
      <label class="pet-upload-action">
        <input type="file" accept="image/*" @change="handleUploadChange" />
        <span>{{ uploading ? '上传中...' : `上传到${activeSlotLabel}` }}</span>
      </label>
      <div class="pet-url-action">
        <input v-model.trim="manualUrl" placeholder="粘贴图片 URL，作为当前槽位参考图" />
        <button type="button" @click="addManualUrl">添加 URL</button>
      </div>
    </div>

    <p v-if="errorMessage" class="pet-material-error">{{ errorMessage }}</p>

    <div class="pet-asset-toolbar">
      <input
        v-model.trim="keyword"
        :disabled="loadingAssets"
        placeholder="搜索资产中心图片素材"
        @keydown.enter.prevent="loadAssets"
      />
      <select v-model="scope" :disabled="loadingAssets">
        <option value="private">私有素材</option>
        <option value="global">公共素材</option>
        <option value="all">全部素材</option>
      </select>
      <button type="button" :disabled="loadingAssets" @click="loadAssets">搜索</button>
    </div>

    <div v-if="loadingAssets" class="pet-asset-empty">正在加载资产中心素材。</div>
    <div v-else-if="assetOptions.length === 0" class="pet-asset-empty">
      暂无可选图片素材，可先上传图片或粘贴图片 URL。
    </div>
    <div v-else class="pet-asset-grid">
      <article v-for="asset in assetOptions" :key="asset.assetId" class="pet-asset-card">
        <img v-if="assetPreviewUrl(asset)" :src="assetPreviewUrl(asset)" :alt="asset.fileName" />
        <span v-else>图片</span>
        <strong>{{ asset.fileName }}</strong>
        <small>{{ assetSubtitle(asset) }}</small>
        <button type="button" @click="selectAsset(asset)">加入{{ activeSlotLabel }}</button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAssets, uploadMaterialAsset, type AssetListScope } from '../../../services/assetApi'
import { normalizePublicMediaUrl } from '../../../utils/mediaUrl'
import type { AssetItem } from '../../../types/assetTypes'
import type { PetReferenceMaterial } from '../petCreationTypes'

type PetMaterialRole = PetReferenceMaterial['role']

const props = defineProps<{
  modelValue: PetReferenceMaterial[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PetReferenceMaterial[]]
}>()

const materialSlots: Array<{ role: PetMaterialRole; label: string; shortLabel: string; hint: string }> = [
  { role: 'main_pet', label: '主宠物', shortLabel: '主', hint: '必填，建议上传清晰正面照' },
  { role: 'second_pet', label: '第二只宠物', shortLabel: '副', hint: '可选，用于双宠物对话' },
  { role: 'prop', label: '道具参考', shortLabel: '道具', hint: '可选，补充玩具、零食等道具' },
  { role: 'scene', label: '背景/场景参考', shortLabel: '背景', hint: '可选，补充客厅、草地、宠物店等背景图' },
]

const activeRole = ref<PetMaterialRole>('main_pet')
const keyword = ref('')
const scope = ref<AssetListScope>('all')
const manualUrl = ref('')
const loadingAssets = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const assetOptions = ref<AssetItem[]>([])

const materialByRole = computed(() =>
  props.modelValue.reduce<Partial<Record<PetMaterialRole, PetReferenceMaterial>>>((map, material) => {
    map[material.role] = material
    return map
  }, {}),
)

const activeSlotLabel = computed(
  () => materialSlots.find((slot) => slot.role === activeRole.value)?.label || '当前槽位',
)

function assetPreviewUrl(asset: AssetItem) {
  return normalizePublicMediaUrl(asset.thumbnailUrl || asset.fileUrl || '')
}

function assetSubtitle(asset: AssetItem) {
  const sizeKb = asset.fileSize > 0 ? `${Math.ceil(asset.fileSize / 1024)}KB` : '未知大小'
  return `${asset.sourceType || '素材'} · ${sizeKb}`
}

function upsertMaterial(material: PetReferenceMaterial) {
  const next = props.modelValue.filter((item) => item.role !== material.role)
  emit('update:modelValue', [...next, material])
}

function removeMaterial(role: PetMaterialRole) {
  emit('update:modelValue', props.modelValue.filter((item) => item.role !== role))
}

function selectAsset(asset: AssetItem) {
  upsertMaterial({
    id: `asset-${asset.assetId}-${activeRole.value}`,
    role: activeRole.value,
    assetId: String(asset.assetId),
    url: assetPreviewUrl(asset),
    label: asset.fileName || activeSlotLabel.value,
  })
}

function addManualUrl() {
  const url = normalizePublicMediaUrl(manualUrl.value)
  if (!url) {
    errorMessage.value = '请先输入图片 URL'
    return
  }
  upsertMaterial({
    id: `url-${activeRole.value}-${Date.now()}`,
    role: activeRole.value,
    url,
    label: `${activeSlotLabel.value} URL 参考图`,
  })
  manualUrl.value = ''
  errorMessage.value = ''
}

async function handleUploadChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const asset = await uploadMaterialAsset(file, {
      businessDomain: 'pet',
      metadataJson: JSON.stringify({
        businessDomain: 'pet',
        domain: 'pet_creation',
        assetGroup: '宠物素材',
        assetRole: activeRole.value,
        materialRole: activeRole.value,
      }),
    })
    selectAsset(asset)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '上传宠物素材失败'
  } finally {
    uploading.value = false
  }
}

async function loadAssets() {
  loadingAssets.value = true
  errorMessage.value = ''
  try {
    assetOptions.value = await getAssets({
      assetType: 'IMAGE',
      keyword: keyword.value,
      scope: scope.value,
      pageNo: 1,
      pageSize: 12,
      businessDomain: 'pet',
    })
  } catch (error) {
    assetOptions.value = []
    void error
    errorMessage.value = ''
  } finally {
    loadingAssets.value = false
  }
}

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
.pet-asset-empty {
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

.pet-material-slot > button:first-child {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0;
}

.pet-material-slot img,
.pet-asset-card img {
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

.pet-asset-card img,
.pet-asset-card > span {
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

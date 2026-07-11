<template>
  <section class="pet-image-tool app-page-stack">
    <header class="tool-page-hero">
      <h1>{{ pageCopy.title }}</h1>
      <p>{{ pageCopy.description }}</p>
    </header>

    <div class="pet-image-layout">
      <section class="app-card pet-image-panel">
        <div class="pet-image-field-grid">
          <label>
            名称
            <input v-model.trim="form.name" type="text" :placeholder="pageCopy.namePlaceholder" />
          </label>
          <label>
            风格
            <select v-model="form.style">
              <option v-for="option in styleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>
            数量
            <select v-model.number="form.imageCount">
              <option :value="1">1 张</option>
              <option :value="2">2 张</option>
              <option :value="3">3 张</option>
              <option :value="4">4 张</option>
            </select>
          </label>
          <label>
            尺寸
            <select v-model="form.size">
              <option value="1K">1K</option>
              <option value="2K">2K</option>
            </select>
          </label>
        </div>

        <BillingEstimateBanner
          :estimated-credit-cost="imageEstimate.estimatedCreditCost.value"
          :balance="imageEstimate.balance.value"
          :loading="imageEstimate.loading.value"
          :steps="imageEstimate.steps.value"
        />

        <label class="pet-image-prompt">
          生成提示词
          <textarea v-model.trim="form.prompt" rows="7" :placeholder="pageCopy.promptPlaceholder" />
        </label>

        <div class="pet-image-reference">
          <div class="pet-image-section-head">
            <div>
              <strong>参考图</strong>
              <span>{{ pageCopy.referenceHint }}</span>
            </div>
            <button type="button" class="app-secondary-button" :disabled="loadingAssets" @click="loadReferenceAssets">
              {{ loadingAssets ? '刷新中...' : '刷新宠物图片' }}
            </button>
          </div>
          <div v-if="referenceAssets.length === 0" class="app-empty-block">宠物资产中心暂无可用图片参考。</div>
          <div v-else class="pet-image-reference-list">
            <label v-for="asset in referenceAssets" :key="asset.assetId" class="pet-image-reference-item">
              <input v-model="form.referenceAssetIds" type="checkbox" :value="asset.assetId" />
              <img :src="assetUrl(asset.thumbnailUrl || asset.fileUrl)" :alt="asset.fileName" />
              <span>{{ asset.fileName }}</span>
            </label>
          </div>
        </div>

        <button
          class="app-primary-button"
          type="button"
          :disabled="submitting || !canSubmit || !!imageEstimate.insufficientHint.value"
          :title="imageEstimate.insufficientHint.value || ''"
          @click="submitGenerate"
        >
          {{ submitting ? '生成中...' : pageCopy.actionLabel }}
        </button>
        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="app-muted pet-image-success">{{ successMessage }}</p>
      </section>

      <section class="app-card pet-image-panel pet-image-result-panel">
        <div class="pet-image-section-head">
          <div>
            <h3>生成结果</h3>
            <span>结果会自动保存到宠物资产中心。</span>
          </div>
          <button type="button" class="app-secondary-button" @click="goPetAssets">打开宠物资产</button>
        </div>
        <div v-if="generatedAssets.length === 0" class="app-empty-block pet-image-empty">
          提交生成后，这里会展示宠物域图片资产。
        </div>
        <div v-else class="pet-image-result-grid">
          <article v-for="asset in generatedAssets" :key="asset.assetId" class="pet-image-result-card">
            <img :src="assetUrl(asset.thumbnailUrl || asset.fileUrl)" :alt="asset.fileName" />
            <div>
              <strong>{{ asset.fileName }}</strong>
              <span>{{ asset.assetGroup || pageCopy.assetGroup }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { API_ORIGIN } from '../../services/request'
import { getAssets } from '../../services/assetApi'
import { generatePetImageAsset, type PetImageAssetKind } from '../../services/petAssetToolApi'
import type { AssetItem } from '../../types/assetTypes'

const props = withDefaults(defineProps<{
  mode?: PetImageAssetKind
}>(), {
  mode: 'pet',
})

const router = useRouter()
const referenceAssets = ref<AssetItem[]>([])
const generatedAssets = ref<AssetItem[]>([])
const loadingAssets = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const pageCopy = computed(() => {
  if (props.mode === 'background') {
    return {
      title: '背景图生成',
      description: '生成宠物视频可复用的背景图、场景图和氛围参考，只保存到宠物资产域。',
      namePlaceholder: '例如：午后客厅背景',
      promptPlaceholder: '例如：温暖明亮的客厅地毯场景，低机位，适合小猫出镜，干净自然光，不要文字',
      referenceHint: '可选择已有宠物场景图作为氛围参考。',
      actionLabel: '生成背景图',
      assetGroup: '宠物背景图',
      defaultPrompt: '温暖明亮的宠物短视频背景图，室内客厅地毯，自然光，低机位，留出宠物主体活动空间，不要文字、水印和人物',
    }
  }
  return {
    title: 'AI宠物生成',
    description: '生成宠物主体参考图，保存到宠物资产中心，后续可用于萌宠视频创作。',
    namePlaceholder: '例如：奶盖主宠物',
    promptPlaceholder: '例如：一只圆脸银渐层小猫，眼睛明亮，坐在浅色地毯上，真实可爱，主体清晰',
    referenceHint: '可选择已有主宠物图片保持毛色、花纹和脸型。',
    actionLabel: '生成AI宠物',
    assetGroup: 'AI宠物素材',
    defaultPrompt: '一只真实可爱的宠物主体参考图，毛色和花纹清晰，正面或三分之二侧脸，眼睛明亮，干净背景，适合后续宠物短视频生成，不要文字和水印',
  }
})

const styleOptions = [
  { value: '真实写实，商业摄影质感', label: '真实写实' },
  { value: '可爱治愈，短视频封面质感', label: '可爱治愈' },
  { value: '轻拟人化但保持宠物身份', label: '轻拟人' },
  { value: '温暖自然光，生活方式摄影', label: '生活方式' },
]

const form = reactive({
  name: '',
  prompt: pageCopy.value.defaultPrompt,
  style: styleOptions[0].value,
  imageCount: 2,
  size: '2K',
  referenceAssetIds: [] as number[],
})

const imageEstimate = useBillingEstimate({
  taskType: () => (props.mode === 'background' ? 'PET_BACKGROUND_GENERATE' : 'PET_IMAGE_GENERATE'),
  watchKeys: () => [props.mode, form.imageCount, form.size],
  buildRequest: () => ({
    imageCount: form.imageCount,
  }),
})

const canSubmit = computed(() => Boolean(form.prompt.trim() && form.imageCount >= 1))

watch(
  () => props.mode,
  () => {
    form.name = ''
    form.prompt = pageCopy.value.defaultPrompt
    form.referenceAssetIds = []
    generatedAssets.value = []
    errorMessage.value = ''
    successMessage.value = ''
  },
)

onMounted(() => {
  void loadReferenceAssets()
})

async function loadReferenceAssets() {
  loadingAssets.value = true
  errorMessage.value = ''
  try {
    referenceAssets.value = await getAssets({
      assetType: 'IMAGE',
      businessDomain: 'pet',
      scope: 'all',
      sort: 'createdAtDesc',
      pageSize: 40,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载宠物参考图失败'
  } finally {
    loadingAssets.value = false
  }
}

async function submitGenerate() {
  if (submitting.value || !canSubmit.value) return
  if (imageEstimate.insufficientHint.value) {
    errorMessage.value = imageEstimate.insufficientHint.value
    return
  }
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await generatePetImageAsset({
      kind: props.mode,
      name: form.name,
      prompt: form.prompt,
      style: form.style,
      imageCount: form.imageCount,
      size: form.size,
      referenceAssetIds: form.referenceAssetIds,
    })
    generatedAssets.value = result.assets || []
    successMessage.value = `已生成 ${generatedAssets.value.length} 张图片并保存到宠物资产中心。`
    await loadReferenceAssets()
    await imageEstimate.refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成失败'
  } finally {
    submitting.value = false
  }
}

function goPetAssets() {
  void router.push({
    name: 'pet-assets',
    query: {
      tab: 'materials',
      workflowStage: props.mode === 'background' ? 'petBackground' : 'petPet',
    },
  })
}

function assetUrl(url?: string | null) {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}
</script>

<style scoped>
.pet-image-tool {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto 32px;
}

.pet-image-layout {
  display: grid;
  grid-template-columns: minmax(340px, 460px) minmax(0, 1fr);
  gap: 16px;
}

.pet-image-panel {
  display: grid;
  gap: 16px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  box-shadow: none;
}

.pet-image-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pet-image-panel label {
  display: grid;
  gap: 8px;
  color: var(--hs-text, #172033);
  font-size: 13px;
  font-weight: 800;
}

.pet-image-panel input,
.pet-image-panel select,
.pet-image-panel textarea {
  width: 100%;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 6px;
  background: #ffffff;
  color: var(--hs-text, #172033);
  padding: 10px 12px;
  outline: none;
}

.pet-image-panel input:focus,
.pet-image-panel select:focus,
.pet-image-panel textarea:focus {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pet-image-prompt {
  grid-column: 1 / -1;
}

.pet-image-reference {
  display: grid;
  gap: 12px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  padding: 12px;
}

.pet-image-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-image-section-head div {
  display: grid;
  gap: 4px;
}

.pet-image-section-head h3,
.pet-image-section-head strong {
  margin: 0;
  color: var(--hs-text, #172033);
  font-size: 16px;
  font-weight: 850;
}

.pet-image-section-head span,
.pet-image-success {
  color: var(--hs-muted, #667085);
  font-size: 12px;
  line-height: 1.55;
}

.pet-image-reference-list {
  display: grid;
  max-height: 260px;
  gap: 10px;
  overflow: auto;
}

.pet-image-reference-item {
  display: grid !important;
  grid-template-columns: auto 54px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
  cursor: pointer;
}

.pet-image-reference-item img {
  width: 54px;
  height: 54px;
  border-radius: 6px;
  object-fit: cover;
}

.pet-image-reference-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-image-result-panel {
  align-content: start;
}

.pet-image-empty,
.app-empty-block {
  padding: 24px;
}

.pet-image-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.pet-image-result-card {
  overflow: hidden;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
}

.pet-image-result-card img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  background: #eef2f7;
}

.pet-image-result-card div {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
}

.pet-image-result-card strong {
  overflow: hidden;
  color: var(--hs-text, #172033);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-image-result-card span {
  color: var(--hs-muted, #667085);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .pet-image-tool {
    width: calc(100% - 32px);
  }

  .pet-image-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .pet-image-tool {
    width: calc(100% - 24px);
  }

  .pet-image-field-grid,
  .pet-image-reference-item {
    grid-template-columns: 1fr;
  }
}
</style>

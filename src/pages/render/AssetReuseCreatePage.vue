<template>
  <section class="asset-reuse-page">
    <div class="asset-reuse-redesign">
      <header class="asset-reuse-head">
        <div class="asset-title-line">
          <div>
            <h1>
              资产复用创作
              <span class="asset-head-tag">从资产中心选择素材，快速生成视频</span>
            </h1>
            <p>从已有文案、分镜、数字人和素材中组合生成新视频。</p>
          </div>
        </div>
        <div class="asset-reuse-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadAssets">刷新资产</el-button>
          <el-button
            type="primary"
            :icon="Finished"
            :disabled="selectedAssets.length === 0 || planPreviewLoading || planSubmitting"
            @click="prepareAssetReusePlanPreview"
          >
            {{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '进入方案确认' }}
          </el-button>
        </div>
      </header>

      <nav class="asset-steps" aria-label="资产复用流程">
        <div class="asset-step active">
          <span>1</span>
          <strong>选择素材</strong>
        </div>
        <div class="asset-step" :class="{ active: selectedAssets.length > 0 }">
          <span>2</span>
          <strong>方案确认</strong>
        </div>
        <div class="asset-step" :class="{ active: selectedAssets.length > 0 && draftPrompt.trim() }">
          <span>3</span>
          <strong>生成视频</strong>
        </div>
        <div class="asset-step">
          <span>4</span>
          <strong>完成</strong>
        </div>
      </nav>

      <p class="asset-page-note">从资产中心选择已有素材，组合生成新视频</p>
      <el-alert v-if="error" class="asset-reuse-alert" :title="error" type="warning" show-icon :closable="false" />

      <div class="asset-reuse-shell">
        <main class="asset-stage-list">
          <section class="asset-stage-card asset-stage-card--copy">
            <div class="stage-title">
              <span>1</span>
              <h2>选择文案</h2>
              <button type="button" class="link-action" @click="goToAssetCenter">进入资产中心 ›</button>
            </div>
            <div class="asset-source-tabs">
              <button type="button" class="active">资产中心选择</button>
              <button type="button" @click="applyAiCopyPrompt">
                AI生成新文案
              </button>
            </div>
            <div class="asset-card-row" :aria-busy="loading">
              <article v-for="item in loading ? 5 : 0" :key="`copy-skeleton-${item}`" class="reuse-choice-card reuse-choice-card--skeleton">
                <strong></strong>
                <span></span>
                <small></small>
              </article>
              <article
                v-for="asset in categoryAssets('copy', 5)"
                :key="asset.assetId"
                :class="['reuse-choice-card', { selected: isSelected(asset.assetId) }]"
                role="button"
                tabindex="0"
                @click="toggleAssetFromCategory(asset, 'copy')"
                @keydown.enter.prevent="toggleAssetFromCategory(asset, 'copy')"
                @keydown.space.prevent="toggleAssetFromCategory(asset, 'copy')"
              >
                <strong>{{ asset.fileName }}</strong>
                <span>{{ sourceLabel(asset) }}｜{{ assetTypeLabel(asset.assetType) }}</span>
                <p class="reuse-card-excerpt">{{ assetPreviewExcerpt(asset) }}</p>
                <div class="reuse-card-actions">
                  <button type="button" @click.stop="toggleAssetFromCategory(asset, 'copy')">
                    {{ isSelected(asset.assetId) ? '已选择' : '选择' }}
                  </button>
                  <button type="button" @click.stop="openAssetTextPreview(asset, '文案预览')">预览</button>
                </div>
                <small>{{ formatDate(asset.updatedAt || asset.createdAt) }}</small>
              </article>
              <article v-if="!loading && categoryAssets('copy', 1).length === 0" class="reuse-empty-card">
                暂无文案资产，可先在资产中心上传，或使用 AI 智能创作沉淀文案。
              </article>
            </div>
          </section>

          <section class="asset-stage-card">
            <div class="stage-title">
              <span>2</span>
              <h2>选择分镜</h2>
              <button type="button" class="link-action" @click="goToAssetCenter">进入资产中心 ›</button>
            </div>
            <div class="asset-card-row asset-card-row--story" :aria-busy="loading">
              <article v-for="item in loading ? 5 : 0" :key="`story-skeleton-${item}`" class="reuse-shot-card reuse-choice-card--skeleton">
                <span class="shot-thumb"></span>
                <strong></strong>
                <small></small>
              </article>
              <article
                v-for="asset in categoryAssets('storyboard', 5)"
                :key="asset.assetId"
                :class="['reuse-shot-card', { selected: isSelected(asset.assetId) }]"
                role="button"
                tabindex="0"
                @click="toggleAssetFromCategory(asset, 'storyboard')"
                @keydown.enter.prevent="toggleAssetFromCategory(asset, 'storyboard')"
                @keydown.space.prevent="toggleAssetFromCategory(asset, 'storyboard')"
              >
                <span class="shot-thumb">
                  <img v-if="isVisualAsset(asset) && mediaUrl(asset)" :src="mediaUrl(asset)" alt="" />
                  <el-icon v-else :size="20"><component :is="categoryIcon('storyboard')" /></el-icon>
                </span>
                <strong>{{ asset.fileName }}</strong>
                <p class="reuse-card-excerpt">{{ assetPreviewExcerpt(asset) }}</p>
                <div class="reuse-card-actions reuse-card-actions--story">
                  <button type="button" @click.stop="toggleAssetFromCategory(asset, 'storyboard')">
                    {{ isSelected(asset.assetId) ? '已选择' : '选择' }}
                  </button>
                  <button type="button" @click.stop="openAssetTextPreview(asset, '分镜脚本预览')">预览</button>
                </div>
                <small>{{ sourceLabel(asset) }}｜{{ formatDate(asset.updatedAt || asset.createdAt) }}</small>
              </article>
              <article v-if="!loading && categoryAssets('storyboard', 1).length === 0" class="reuse-empty-card">
                暂无分镜资产，解析爆款视频后会自动沉淀可复用分镜。
              </article>
            </div>
          </section>

          <div class="asset-option-grid">
            <section class="asset-stage-card asset-stage-card--compact">
              <div class="stage-title">
                <span>3</span>
                <h2>选择数字人（可选）</h2>
                <button type="button" class="link-action" @click="filters.category = 'avatar'">更多数字人 ›</button>
              </div>
              <div class="compact-choice-row">
                <button type="button" class="reuse-choice-card muted">不使用数字人</button>
              <button
                v-for="asset in categoryAssets('avatar', 2)"
                :key="asset.assetId"
                type="button"
                :class="['reuse-choice-card media-card', { selected: isSelected(asset.assetId) }]"
                @click="toggleAssetFromCategory(asset, 'avatar')"
              >
                <img v-if="mediaUrl(asset)" :src="mediaUrl(asset)" alt="" />
                <el-icon v-else class="media-card-icon"><User /></el-icon>
                <span>{{ asset.fileName }}</span>
              </button>
              </div>
            </section>

            <section class="asset-stage-card asset-stage-card--compact">
              <div class="stage-title">
                <span>4</span>
                <h2>选择配音（可选）</h2>
                <button type="button" class="link-action" @click="filters.category = 'bgm'">更多配音 ›</button>
              </div>
              <div class="compact-choice-row">
                <button type="button" class="reuse-choice-card muted">不使用配音</button>
                <button
                  v-for="asset in categoryAssets('bgm', 2)"
                  :key="asset.assetId"
                  type="button"
                  :class="['reuse-choice-card audio-card', { selected: isSelected(asset.assetId) }]"
                  @click="toggleAssetWithRole(asset, 'voiceover')"
                >
                  <span class="audio-icon"><el-icon><Microphone /></el-icon></span>
                  <span>{{ asset.fileName }}</span>
                </button>
              </div>
            </section>

            <section class="asset-stage-card asset-stage-card--compact">
              <div class="stage-title">
                <span>5</span>
                <h2>选择背景音乐（可选）</h2>
                <button type="button" class="link-action" @click="filters.category = 'bgm'">更多音乐 ›</button>
              </div>
              <div class="compact-choice-row">
                <button type="button" class="reuse-choice-card muted">不使用音乐</button>
                <button
                  v-for="asset in categoryAssets('bgm', 2)"
                  :key="`bgm-${asset.assetId}`"
                  type="button"
                  :class="['reuse-choice-card audio-card', { selected: isSelected(asset.assetId) }]"
                  @click="toggleAssetFromCategory(asset, 'bgm')"
                >
                  <span class="music-icon"><el-icon><Headset /></el-icon></span>
                  <span>{{ asset.fileName }}</span>
                </button>
              </div>
            </section>
          </div>

          <section class="asset-stage-card">
            <div class="stage-title stage-title--tools">
              <div>
                <span>6</span>
                <h2>选择素材（可选）</h2>
              </div>
              <div class="asset-filter-tools">
                <el-input
                  v-model="filters.keyword"
                  clearable
                  placeholder="搜索文件名、标签、来源"
                  :prefix-icon="Search"
                />
                <el-select v-model="filters.scope">
                  <el-option label="全部" value="all" />
                  <el-option label="我的" value="private" />
                  <el-option label="公共" value="global" />
                </el-select>
                <el-button @click="resetFilters">重置</el-button>
              </div>
            </div>
            <div class="asset-type-tabs">
              <button
                v-for="category in categories"
                :key="category.key"
                type="button"
                :class="{ active: filters.category === category.key }"
                @click="filters.category = category.key"
              >
                {{ category.label }}
              </button>
            </div>
            <div
              class="asset-material-grid"
              :class="{ 'asset-material-grid--packages': filters.category === 'vehicle' }"
              :aria-busy="loading"
            >
              <button type="button" class="upload-tile" @click="router.push({ name: 'AssetCenter' })">
                <span><el-icon><Upload /></el-icon></span>
                <strong>创建素材包</strong>
              </button>
              <article
                v-for="item in loading ? 6 : 0"
                :key="`material-skeleton-${item}`"
                class="material-card reuse-choice-card--skeleton"
              >
                <span class="material-preview"></span>
                <strong></strong>
                <small></small>
              </article>
              <template v-if="!loading">
                <button
                  v-for="asset in visibleAssets"
                  :key="asset.assetId"
                  type="button"
                  :class="[filters.category === 'vehicle' ? 'vehicle-bundle-card' : 'material-card', { selected: isSelected(asset.assetId) }]"
                  @click="toggleAssetFromCategory(asset, filters.category)"
                >
                  <span v-if="filters.category === 'vehicle'" class="vehicle-bundle-preview">
                    <img v-if="carBundleCoverUrl(asset)" :src="carBundleCoverUrl(asset)" alt="" />
                    <el-icon v-else><PictureRounded /></el-icon>
                  </span>
                  <span v-else class="material-preview">
                    <img v-if="isVisualAsset(asset) && mediaUrl(asset)" :src="mediaUrl(asset)" alt="" />
                    <el-icon v-else :size="24"><component :is="activeCategory.icon" /></el-icon>
                  </span>
                  <span v-if="filters.category === 'vehicle'" class="vehicle-bundle-body">
                    <strong>{{ carBundleTitle(asset) }}</strong>
                    <small>{{ carBundleMeta(asset) }}</small>
                    <span class="vehicle-bundle-tags">
                      <em>{{ carBundleImageCount(asset) ? `${carBundleImageCount(asset)} 张图片` : '图片已打包' }}</em>
                      <em>车型素材包</em>
                    </span>
                  </span>
                  <template v-else>
                    <strong>{{ asset.fileName }}</strong>
                    <small>{{ assetTypeLabel(asset.assetType) }}</small>
                  </template>
                </button>
              </template>
              <el-empty
                v-if="!loading && visibleAssets.length === 0"
                class="material-empty"
                :description="filters.category === 'vehicle' ? '暂无车型素材包，请先在资产中心创建' : '没有找到符合条件的资产'"
              />
            </div>
          </section>
        </main>

        <aside class="asset-preview-rail">
          <section class="plan-preview-card">
            <div class="preview-card-head">
              <h2>方案预览</h2>
              <button v-if="selectedAssets.length" type="button" @click="clearSelectedAssets">清空全部</button>
            </div>
            <div class="preview-list">
              <div class="preview-item">
                <span class="preview-icon blue"><el-icon><Document /></el-icon></span>
                <div>
                  <strong>文案</strong>
                  <p>{{ selectedSummary(['voice_script', 'benchmark_json'], '待选择文案') }}</p>
                </div>
                <button type="button" @click="filters.category = 'copy'">编辑</button>
              </div>
              <div class="preview-item">
                <span class="preview-icon indigo"><el-icon><Collection /></el-icon></span>
                <div>
                  <strong>分镜</strong>
                  <p>{{ selectedSummary(['storyboard_json'], '待选择分镜') }}</p>
                </div>
                <button type="button" @click="filters.category = 'storyboard'">编辑</button>
              </div>
              <div class="preview-item">
                <span class="preview-icon avatar"><el-icon><User /></el-icon></span>
                <div>
                  <strong>数字人</strong>
                  <p>{{ selectedSummary(['host_image', 'host_video'], '不使用数字人') }}</p>
                </div>
                <button type="button" @click="filters.category = 'avatar'">编辑</button>
              </div>
              <div class="preview-item">
                <span class="preview-icon voice"><el-icon><Microphone /></el-icon></span>
                <div>
                  <strong>配音</strong>
                  <p>{{ selectedSummary(['voiceover'], '不使用配音') }}</p>
                </div>
                <button type="button" @click="filters.category = 'bgm'">编辑</button>
              </div>
              <div class="preview-item">
                <span class="preview-icon music"><el-icon><Headset /></el-icon></span>
                <div>
                  <strong>背景音乐</strong>
                  <p>{{ selectedSummary(['bgm'], '不使用音乐') }}</p>
                </div>
                <button type="button" @click="filters.category = 'bgm'">编辑</button>
              </div>
              <div class="preview-item">
                <span class="preview-icon material"><el-icon><PictureRounded /></el-icon></span>
                <div>
                  <strong>素材</strong>
                  <p>已选择 {{ selectedAssets.length }} 项素材</p>
                </div>
                <button type="button" @click="filters.category = 'vehicle'">编辑</button>
              </div>
            </div>

            <div v-if="selectedAssets.length" class="selection-list">
              <div v-for="item in selectedAssets" :key="item.asset.assetId" class="selection-item">
                <div>
                  <strong>{{ item.asset.fileName }}</strong>
                  <span>{{ assetTypeLabel(item.asset.assetType) }}</span>
                </div>
                <el-select v-model="item.role" size="small">
                  <el-option
                    v-for="role in roleOptions"
                    :key="role.value"
                    :label="role.label"
                    :value="role.value"
                  />
                </el-select>
                <button
                  type="button"
                  class="selection-cover-button"
                  :class="{ active: selectedCoverAssetId === item.asset.assetId }"
                  :disabled="!assetCoverPreviewUrl(item.asset)"
                  @click="setCoverAsset(item.asset)"
                >
                  {{ selectedCoverAssetId === item.asset.assetId ? '当前封面' : '设为封面' }}
                </button>
                <button type="button" @click="removeSelected(item.asset.assetId)">移除</button>
              </div>
            </div>
          </section>

          <section class="video-preview-card">
            <h2>视频效果预览</h2>
            <div class="video-preview-frame">
              <img v-if="previewVisualUrl" :src="previewVisualUrl" alt="" />
              <div v-else class="preview-placeholder">
                <span><el-icon><VideoPlay /></el-icon></span>
                <strong>选择车辆图片后预览</strong>
              </div>
            </div>
            <div class="preview-meta">
              <span>封面：{{ selectedCoverAsset ? selectedCoverAsset.asset.fileName : '自动使用首帧' }}</span>
              <span>预计时长：约 00:45</span>
              <span>预计消耗积分：20 积分</span>
            </div>
            <el-input
              v-model="draftPrompt"
              class="draft-prompt"
              type="textarea"
              maxlength="500"
              :rows="4"
              show-word-limit
              placeholder="补充本次生成目标，例如车型、卖点、门店活动、目标客户"
            />
            <el-button class="selection-submit" type="primary" :disabled="selectedAssets.length === 0 || planPreviewLoading || planSubmitting" @click="prepareAssetReusePlanPreview">
              {{ planPreviewLoading ? '方案生成中...' : planSubmitting ? '提交中...' : '进入方案确认' }}
            </el-button>
            <el-button class="save-draft-button" :disabled="selectedAssets.length === 0" @click="saveAssetReuseDraft">保存为草稿</el-button>
            <p>提示：生成的视频将保存在「我的视频」中</p>
          </section>
        </aside>
      </div>
    </div>

    <AiPlanPreviewDrawer
      v-model="planPreviewOpen"
      :loading="planPreviewLoading || planSubmitting"
      :error="planPreviewError"
      :plan="planPreview"
      @update-script="updatePlanScript"
      @back="planPreviewOpen = false"
      @refresh="prepareAssetReusePlanPreview"
      @confirm="confirmAssetReusePlan"
    />
    <el-dialog v-model="assetPreviewDialog.open" :title="assetPreviewDialog.title" width="720px">
      <div v-if="assetPreviewDialog.loading" class="asset-text-preview-state">正在加载预览...</div>
      <div v-else-if="assetPreviewDialog.error" class="asset-text-preview-state asset-text-preview-state--error">
        {{ assetPreviewDialog.error }}
      </div>
      <pre v-else class="asset-text-preview-body">{{ assetPreviewDialog.text }}</pre>
      <template #footer>
        <el-button @click="assetPreviewDialog.open = false">关闭</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Collection,
  Document,
  Film,
  Finished,
  Headset,
  Microphone,
  PictureRounded,
  Refresh,
  Search,
  Upload,
  User,
  VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAssetTextContent, getAssets, type AssetListScope, type ListAssetsParams } from '../../services/assetApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { newVideoIdempotencyKey, quickRenderVideo } from '../../services/videoApi'
import { useAuthRequired } from '../../composables/useAuthRequired'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import type { QuickRenderAssetRole } from '../../types/videoTypes'
import {
  CAR_MODEL_BUNDLE_GROUP,
  assetWorkflowDisplayMeta,
  assetWorkflowDisplayTitle,
  isCarModelBundleAsset,
} from '../../utils/assetWorkflow'
import { normalizePublicMediaUrl } from '../../utils/mediaUrl'
import AiPlanPreviewDrawer from './AiPlanPreviewDrawer.vue'
import {
  buildQuickRenderRequestFromPlanDraft,
  planAssetFromAssetItem,
  prepareCarSalesAiPlanPreview,
  type AiPlanPreview,
  type CarSalesPlanDraft,
} from './carSalesPlanDraft'

type AssetReuseCategoryKey = 'vehicle' | 'copy' | 'storyboard' | 'avatar' | 'bgm' | 'video'

interface AssetCategory {
  key: AssetReuseCategoryKey
  label: string
  hint: string
  icon: Component
  defaultRole: QuickRenderAssetRole
}

interface SelectedAsset {
  asset: AssetItem
  role: QuickRenderAssetRole
}

interface StoredAssetReuseDraft {
  savedAt: string
  draftPrompt: string
  selectedCoverAssetId: number | null
  selectedAssets: SelectedAsset[]
}

const MAX_VISIBLE_ASSETS = 80
const ASSET_REUSE_PAGE_SIZE = 30
const ASSET_REUSE_DRAFT_STORAGE_KEY = 'huashuo.assetReuseDraft.v1'

const categories: AssetCategory[] = [
  { key: 'vehicle', label: '车型素材包', hint: '车型图集、卖点、参数', icon: PictureRounded, defaultRole: 'car_model_bundle' },
  { key: 'copy', label: '文案模板', hint: '口播、卖点、爆款文案', icon: Document, defaultRole: 'voice_script' },
  { key: 'storyboard', label: '分镜模板', hint: '镜头结构与脚本', icon: Collection, defaultRole: 'storyboard_json' },
  { key: 'avatar', label: '数字人', hint: '形象、口播视频', icon: User, defaultRole: 'host_image' },
  { key: 'bgm', label: '背景音乐', hint: 'BGM、口播音频', icon: Headset, defaultRole: 'bgm' },
  { key: 'video', label: '视频素材', hint: '门店、试驾、参考片段', icon: Film, defaultRole: 'material_video' },
]

const roleOptions: Array<{ value: QuickRenderAssetRole; label: string }> = [
  { value: 'car_model_bundle', label: '车型素材包' },
  { value: 'car_exterior_front', label: '车辆主图' },
  { value: 'car_exterior_side', label: '车辆侧面' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'voice_script', label: '口播文案' },
  { value: 'storyboard_json', label: '分镜JSON' },
  { value: 'benchmark_json', label: '爆款对标' },
  { value: 'host_image', label: '数字人形象' },
  { value: 'host_video', label: '数字人口播' },
  { value: 'bgm', label: '背景音乐' },
  { value: 'voiceover', label: '口播音频' },
  { value: 'material_video', label: '视频素材' },
  { value: 'reference_video', label: '参考视频' },
  { value: 'material', label: '普通素材' },
]

const router = useRouter()
const { requireAuth } = useAuthRequired()
const filters = reactive({
  category: 'vehicle' as AssetReuseCategoryKey,
  keyword: '',
  scope: 'private' as AssetListScope,
})
const assets = ref<AssetItem[]>([])
const selectedAssets = ref<SelectedAsset[]>([])
const selectedCoverAssetId = ref<number | null>(null)
const draftPrompt = ref('')
const loading = ref(false)
const error = ref('')
const planPreviewOpen = ref(false)
const planPreviewLoading = ref(false)
const planSubmitting = ref(false)
const planPreviewError = ref('')
const planPreview = ref<AiPlanPreview | null>(null)
const assetReusePlanDraft = ref<CarSalesPlanDraft | null>(null)
const assetPreviewTextById = ref<Record<number, string>>({})
const assetPreviewLoadingById = ref<Record<number, boolean>>({})
const assetPreviewDialog = reactive({
  open: false,
  loading: false,
  title: '',
  text: '',
  error: '',
})

const activeCategory = computed(() => categories.find((item) => item.key === filters.category) || categories[0])
const normalizedKeyword = computed(() => filters.keyword.trim().toLowerCase())
const visibleAssets = computed(() => categoryAssets(filters.category, MAX_VISIBLE_ASSETS))
const previewVisualUrl = computed(() => {
  if (selectedCoverAsset.value) {
    return assetCoverPreviewUrl(selectedCoverAsset.value.asset)
  }
  const visual = selectedAssets.value.find((item) => assetCoverPreviewUrl(item.asset))
  return visual ? assetCoverPreviewUrl(visual.asset) : ''
})
const selectedCoverAsset = computed(() => {
  if (!selectedCoverAssetId.value) return null
  return selectedAssets.value.find((item) => item.asset.assetId === selectedCoverAssetId.value) || null
})

async function loadAssets() {
  loading.value = true
  error.value = ''
  try {
    const requests = buildAssetReuseAssetRequests()
    const settled = await Promise.allSettled(requests.map((params) => getAssets(params)))
    const loaded = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : [])
    const failed = settled.find((item) => item.status === 'rejected')
    if (loaded.length === 0 && failed?.status === 'rejected') {
      throw failed.reason
    }
    assets.value = mergeAssetItems(loaded)
    restoreAssetReuseDraft()
    if (failed?.status === 'rejected') {
      const message = failed.reason instanceof Error ? failed.reason.message : ''
      error.value = message ? `部分资产加载失败：${message}` : '部分资产加载失败'
    }
  } catch (unknownError) {
    assets.value = []
    const message = unknownError instanceof Error ? unknownError.message : ''
    error.value = message.includes('Failed to fetch') ? '资产列表暂时无法加载，请确认后端服务已启动后刷新。' : message || '资产列表加载失败'
  } finally {
    loading.value = false
  }
}

function buildAssetReuseAssetRequests(): ListAssetsParams[] {
  const common: ListAssetsParams = {
    scope: filters.scope,
    sort: 'createdAtDesc',
    pageNo: 1,
    pageSize: ASSET_REUSE_PAGE_SIZE,
    includePreview: false,
  }
  const keyword = filters.keyword.trim()
  if (keyword) {
    common.keyword = keyword
  }
  return [
    { ...common, assetType: 'JSON', assetGroup: CAR_MODEL_BUNDLE_GROUP },
    { ...common, assetType: 'TEXT' },
    { ...common, assetType: 'JSON' },
    { ...common, assetType: 'IMAGE' },
    { ...common, assetType: 'VIDEO' },
    { ...common, assetType: 'AUDIO' },
  ]
}

function mergeAssetItems(items: AssetItem[]) {
  const byId = new Map<number, AssetItem>()
  items.forEach((item) => {
    if (!byId.has(item.assetId)) {
      byId.set(item.assetId, item)
    }
  })
  return Array.from(byId.values()).sort((a, b) => {
    const timeA = Date.parse(a.publishedAt || a.createdAt || a.updatedAt || '') || 0
    const timeB = Date.parse(b.publishedAt || b.createdAt || b.updatedAt || '') || 0
    return timeB - timeA || b.assetId - a.assetId
  })
}

function resetFilters() {
  filters.category = 'vehicle'
  filters.keyword = ''
  filters.scope = 'private'
  void loadAssets()
}

function toggleAssetFromCategory(asset: AssetItem, categoryKey: AssetReuseCategoryKey) {
  const existing = selectedAssets.value.find((item) => item.asset.assetId === asset.assetId)
  if (existing) {
    removeSelected(asset.assetId)
    return
  }
  const category = categoryByKey(categoryKey)
  selectedAssets.value.push({
    asset,
    role: inferDefaultRole(asset, category),
  })
  ensureDefaultCoverAsset(asset)
}

function toggleAssetWithRole(asset: AssetItem, role: QuickRenderAssetRole) {
  const existing = selectedAssets.value.find((item) => item.asset.assetId === asset.assetId)
  if (existing) {
    removeSelected(asset.assetId)
    return
  }
  selectedAssets.value.push({ asset, role })
  ensureDefaultCoverAsset(asset)
}

function removeSelected(assetId: number) {
  selectedAssets.value = selectedAssets.value.filter((item) => item.asset.assetId !== assetId)
  if (selectedCoverAssetId.value === assetId) {
    selectedCoverAssetId.value = firstCoverCandidateId()
  }
}

function clearSelectedAssets() {
  selectedAssets.value = []
  selectedCoverAssetId.value = null
}

function setCoverAsset(asset: AssetItem) {
  if (!assetCoverPreviewUrl(asset)) return
  selectedCoverAssetId.value = asset.assetId
}

function ensureDefaultCoverAsset(asset: AssetItem) {
  if (selectedCoverAssetId.value || !assetCoverPreviewUrl(asset)) return
  selectedCoverAssetId.value = asset.assetId
}

function firstCoverCandidateId() {
  const candidate = selectedAssets.value.find((item) => assetCoverPreviewUrl(item.asset))
  return candidate?.asset.assetId ?? null
}

function isSelected(assetId: number) {
  return selectedAssets.value.some((item) => item.asset.assetId === assetId)
}

function categoryByKey(categoryKey: AssetReuseCategoryKey) {
  return categories.find((category) => category.key === categoryKey) || categories[0]
}

function categoryIcon(categoryKey: AssetReuseCategoryKey) {
  return categoryByKey(categoryKey).icon
}

function categoryAssets(categoryKey: AssetReuseCategoryKey, limit = 5) {
  const keyword = normalizedKeyword.value
  return assets.value
    .filter((asset) => matchesCategory(asset, categoryKey))
    .filter((asset) => !keyword || assetSearchText(asset).includes(keyword))
    .slice(0, limit)
}

watch(
  () => [
    ...categoryAssets('copy', 5),
    ...categoryAssets('storyboard', 5),
  ].map((asset) => `${asset.assetId}:${asset.updatedAt}`).join('|'),
  () => {
    void loadVisibleTextPreviews()
  },
  { immediate: true },
)

async function loadVisibleTextPreviews() {
  const visibleTextAssets = [
    ...categoryAssets('copy', 5),
    ...categoryAssets('storyboard', 5),
  ].filter(isTextPreviewAsset)
  await Promise.all(visibleTextAssets.map((asset) => ensureAssetPreviewText(asset)))
}

function isTextPreviewAsset(asset: AssetItem) {
  return asset.assetType === 'TEXT' || asset.assetType === 'JSON'
}

async function ensureAssetPreviewText(asset: AssetItem) {
  if (!isTextPreviewAsset(asset) || assetPreviewTextById.value[asset.assetId] || assetPreviewLoadingById.value[asset.assetId]) {
    return
  }
  assetPreviewLoadingById.value = {
    ...assetPreviewLoadingById.value,
    [asset.assetId]: true,
  }
  try {
    const text = await getAssetTextContent(asset)
    assetPreviewTextById.value = {
      ...assetPreviewTextById.value,
      [asset.assetId]: normalizeAssetPreviewText(text),
    }
  } catch {
    assetPreviewTextById.value = {
      ...assetPreviewTextById.value,
      [asset.assetId]: metadataPreviewText(asset) || '预览内容暂时无法加载',
    }
  } finally {
    const next = { ...assetPreviewLoadingById.value }
    delete next[asset.assetId]
    assetPreviewLoadingById.value = next
  }
}

function assetPreviewExcerpt(asset: AssetItem) {
  const preview = assetPreviewTextById.value[asset.assetId] || metadataPreviewText(asset)
  if (preview) {
    return preview.length > 70 ? `${preview.slice(0, 70)}...` : preview
  }
  if (assetPreviewLoadingById.value[asset.assetId]) {
    return '正在读取开头...'
  }
  if (isTextPreviewAsset(asset)) {
    void ensureAssetPreviewText(asset)
    return '正在读取开头...'
  }
  return '暂无可预览文本'
}

async function openAssetTextPreview(asset: AssetItem, title: string) {
  assetPreviewDialog.open = true
  assetPreviewDialog.loading = true
  assetPreviewDialog.title = `${title}：${asset.fileName}`
  assetPreviewDialog.text = ''
  assetPreviewDialog.error = ''
  try {
    await ensureAssetPreviewText(asset)
    const text = assetPreviewTextById.value[asset.assetId] || metadataPreviewText(asset)
    assetPreviewDialog.text = text || '暂无可预览文本'
  } catch (unknownError) {
    assetPreviewDialog.error = unknownError instanceof Error ? unknownError.message : '预览加载失败'
  } finally {
    assetPreviewDialog.loading = false
  }
}

function metadataPreviewText(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  return normalizeAssetPreviewText(
    metadataText(metadata, 'voiceText') ||
    metadataText(metadata, 'finalVoiceText') ||
    metadataText(metadata, 'script') ||
    metadataText(metadata, 'content') ||
    metadataText(metadata, 'description') ||
    metadataText(metadata, 'title'),
  )
}

function normalizeAssetPreviewText(value: string | null | undefined) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as unknown
    const readable = readableTextFromJson(parsed)
    if (readable) return normalizePlainPreviewText(readable)
  } catch {
    // Plain text assets are expected here.
  }
  return normalizePlainPreviewText(raw)
}

function readableTextFromJson(value: unknown, depth = 0): string {
  if (!value || depth > 5) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => readableTextFromJson(item, depth + 1))
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
  }
  if (typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  const preferredKeys = [
    'finalVoiceText',
    'voiceText',
    'narration',
    'script',
    'content',
    'text',
    'copywriting',
    'title',
    'visual',
    'visualPrompt',
    'prompt',
  ]
  const direct = preferredKeys
    .map((key) => record[key])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  if (direct.length) {
    return direct.slice(0, 4).join('\n')
  }
  const nestedKeys = ['storyboard', 'shots', 'scenes', 'segments', 'scripts', 'items', 'data']
  return nestedKeys
    .map((key) => readableTextFromJson(record[key], depth + 1))
    .filter(Boolean)
    .slice(0, 4)
    .join('\n')
}

function normalizePlainPreviewText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function goToAssetCenter() {
  void router.push({ name: 'AssetCenter' })
}

function applyAiCopyPrompt() {
  if (!draftPrompt.value.trim()) {
    draftPrompt.value = '请基于当前车型、门店活动和目标客户生成一条汽车销售口播文案'
  }
  filters.category = 'copy'
  ElMessage.success('已填入文案生成提示，可继续补充需求')
}

function saveAssetReuseDraft() {
  if (typeof window === 'undefined' || selectedAssets.value.length === 0) {
    return
  }
  const draft: StoredAssetReuseDraft = {
    savedAt: new Date().toISOString(),
    draftPrompt: draftPrompt.value,
    selectedCoverAssetId: selectedCoverAssetId.value,
    selectedAssets: selectedAssets.value,
  }
  window.localStorage.setItem(ASSET_REUSE_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  ElMessage.success('草稿已保存到本地')
}

function restoreAssetReuseDraft() {
  if (typeof window === 'undefined' || selectedAssets.value.length > 0) {
    return
  }
  const raw = window.localStorage.getItem(ASSET_REUSE_DRAFT_STORAGE_KEY)
  if (!raw) {
    return
  }
  try {
    const draft = JSON.parse(raw) as Partial<StoredAssetReuseDraft>
    const restoredAssets = Array.isArray(draft.selectedAssets)
      ? draft.selectedAssets.filter((item): item is SelectedAsset => Boolean(item?.asset?.assetId && item.role))
      : []
    if (!restoredAssets.length) {
      return
    }
    selectedAssets.value = restoredAssets
    selectedCoverAssetId.value = draft.selectedCoverAssetId ?? firstCoverCandidateId()
    if (typeof draft.draftPrompt === 'string' && !draftPrompt.value.trim()) {
      draftPrompt.value = draft.draftPrompt
    }
  } catch {
    window.localStorage.removeItem(ASSET_REUSE_DRAFT_STORAGE_KEY)
  }
}

function selectedSummary(roles: QuickRenderAssetRole[], fallback: string) {
  const selected = selectedAssets.value.find((item) => roles.includes(item.role))
  return selected?.asset.fileName || fallback
}

async function prepareAssetReusePlanPreview() {
  if (!requireAuth('登录后可生成资产复用视频')) return
  if (selectedAssets.value.length === 0 || planPreviewLoading.value || planSubmitting.value) return
  planPreviewOpen.value = true
  planPreviewLoading.value = true
  planPreviewError.value = ''
  try {
    const draft = await buildAssetReusePlanDraft()
    assetReusePlanDraft.value = draft
    planPreview.value = await prepareCarSalesAiPlanPreview(draft)
  } catch (unknownError) {
    planPreviewError.value = unknownError instanceof Error ? unknownError.message : '方案生成失败'
  } finally {
    planPreviewLoading.value = false
  }
}

async function buildAssetReusePlanDraft(): Promise<CarSalesPlanDraft> {
  const assets = await Promise.all(selectedAssets.value.map(async (item) => {
    let textContent = ''
    if (item.asset.assetType === 'TEXT' || item.asset.assetType === 'JSON') {
      try {
        textContent = await getAssetTextContent(item.asset)
      } catch {
        textContent = ''
      }
    }
    return planAssetFromAssetItem(item.asset, item.role, textContent)
  }))
  const hasVehicle = assets.some((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_') || asset.role.startsWith('scene_'))
  const scriptAsset = assets.find((asset) => asset.role === 'voice_script' && asset.textContent)
  const storyboardAsset = assets.find((asset) => asset.role === 'storyboard_json' && asset.textContent)
  const prompt = draftPrompt.value.trim() || [
    '复用已选资产生成一条汽车销售视频',
    scriptAsset ? `参考文案：${scriptAsset.textContent?.slice(0, 400)}` : '',
    storyboardAsset ? `参考分镜：${storyboardAsset.textContent?.slice(0, 400)}` : '',
  ].filter(Boolean).join('\n')
  const voiceLanguage = inferAssetReuseVoiceLanguage(prompt)

  return {
    source: 'asset-reuse',
    title: '资产复用汽车销售方案',
    prompt,
    script: scriptAsset?.textContent?.trim() || '',
    coverAssetId: selectedCoverAsset.value?.asset.assetId ?? null,
    coverUrl: selectedCoverAsset.value ? assetCoverPreviewUrl(selectedCoverAsset.value.asset) : previewVisualUrl.value,
    assets,
    aspectRatio: '9:16',
    subtitleMode: 'auto',
    subtitleLanguage: voiceLanguage,
    nativeVoiceLanguage: voiceLanguage,
    nativeVoiceStyle: 'natural_sales',
    nativeSpeechStyle: 'balanced',
    burnInSubtitle: true,
    audioPolicy: selectedAssets.value.some((item) => item.role === 'bgm') ? 'bgm' : 'auto',
    model: 'auto',
    segmentCount: 3,
    segmentDuration: 5,
    hostAppearanceEnabled: selectedAssets.value.some((item) => item.role === 'host_image' || item.role === 'host_video'),
    configItems: [
      '资产中心复用',
      `${assets.length} 个素材`,
      scriptAsset ? '已选文案资产' : '',
      storyboardAsset ? '已选分镜资产' : '',
    ].filter(Boolean),
    warnings: hasVehicle ? [] : ['汽车销售生成至少需要 1 张车辆图片，请补充车辆素材后再确认生成。'],
  }
}

function inferAssetReuseVoiceLanguage(text: string): 'zh-CN' | 'en-US' {
  const normalized = text.toLowerCase()
  return normalized.includes('english') || text.includes('英文') || text.includes('英语')
    ? 'en-US'
    : 'zh-CN'
}

function updatePlanScript(value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    script: value,
  }
}

async function confirmAssetReusePlan() {
  if (!requireAuth('登录后可生成资产复用视频')) return
  if (!assetReusePlanDraft.value || !planPreview.value || planSubmitting.value) return
  if (!assetReusePlanDraft.value.assets.some((asset) => asset.role === 'car_model_bundle' || asset.role.startsWith('car_') || asset.role.startsWith('scene_'))) {
    planPreviewError.value = '汽车销售生成至少需要 1 张车辆图片。请返回选择车辆图片或车型素材包后再提交。'
    return
  }
  planSubmitting.value = true
  planPreviewError.value = ''
  try {
    const payload = buildQuickRenderRequestFromPlanDraft(assetReusePlanDraft.value, planPreview.value)
    const submitted = await quickRenderVideo(payload, newVideoIdempotencyKey())
    const taskId = submitted.task?.taskId || submitted.digitalHumanTask?.taskId || null
    if (taskId) {
      rememberSessionTaskId(taskId)
      ElMessage.success('已提交资产复用生成任务')
      planPreviewOpen.value = false
      void router.push({ name: 'my-videos', query: { taskId: String(taskId) } })
      return
    }
    planPreviewError.value = submitted.summary || '任务提交成功，但没有返回可跟踪任务'
  } catch (unknownError) {
    planPreviewError.value = unknownError instanceof Error ? unknownError.message : '提交生成失败'
  } finally {
    planSubmitting.value = false
  }
}

function matchesCategory(asset: AssetItem, category: AssetReuseCategoryKey) {
  const text = assetSearchText(asset)
  if (category === 'vehicle') {
    return isCarModelBundleAsset(asset)
  }
  if (category === 'copy') {
    return ['TEXT', 'JSON'].includes(asset.assetType) && hasAny(text, ['script', 'copy', '文案', '口播', '爆款', 'douyin'])
  }
  if (category === 'storyboard') {
    return asset.assetType === 'JSON' && hasAny(text, ['storyboard', '分镜', '镜头'])
  }
  if (category === 'avatar') {
    return ['IMAGE', 'VIDEO'].includes(asset.assetType) && hasAny(text, ['avatar', '数字人', 'host', '主播'])
  }
  if (category === 'bgm') {
    return asset.assetType === 'AUDIO'
  }
  if (category === 'video') {
    return asset.assetType === 'VIDEO' && !hasAny(text, ['avatar', '数字人', 'host'])
  }
  return true
}

function inferDefaultRole(asset: AssetItem, category: AssetCategory): QuickRenderAssetRole {
  const text = assetSearchText(asset)
  if (category.key === 'vehicle') return 'car_model_bundle'
  if (category.key === 'copy' && hasAny(text, ['benchmark', '爆款', 'douyin'])) return 'benchmark_json'
  if (category.key === 'avatar' && asset.assetType === 'VIDEO') return 'host_video'
  if (category.key === 'bgm' && hasAny(text, ['voice', '口播', 'tts'])) return 'voiceover'
  if (category.key === 'video' && hasAny(text, ['reference', '参考', '对标'])) return 'reference_video'
  return category.defaultRole
}

function isVisualAsset(asset: AssetItem) {
  return ['IMAGE', 'COVER'].includes(asset.assetType)
}

function mediaUrl(asset: AssetItem) {
  return assetCoverPreviewUrl(asset)
}

function assetCoverPreviewUrl(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const url = asset.thumbnailUrl
    || metadataText(metadata, 'thumbnailUrl')
    || metadataText(metadata, 'coverUrl')
    || metadataText(metadata, 'firstFrameUrl')
    || (isVisualAsset(asset) ? asset.fileUrl : '')
  return url ? normalizePublicMediaUrl(url) : ''
}

function carBundleTitle(asset: AssetItem) {
  return assetWorkflowDisplayTitle(asset).replace(/^车型素材包[:：]\s*/, '') || asset.fileName.replace(/-?车型素材包\.json$/i, '')
}

function carBundleMeta(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const color = metadataText(metadata, 'color')
  const groupMeta = assetWorkflowDisplayMeta(asset)
  return [color, groupMeta || sourceLabel(asset), formatDate(asset.updatedAt || asset.createdAt)].filter(Boolean).join(' · ')
}

function carBundleImageCount(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const ids = metadata?.componentAssetIds
  if (Array.isArray(ids)) {
    return ids.length
  }
  return numberMetadata(metadata, 'imageCount') || numberMetadata(metadata, 'componentCount') || 0
}

function carBundleCoverUrl(asset: AssetItem) {
  const metadata = parseMetadata(asset.metadataJson)
  const url = metadataText(metadata, 'coverUrl') || metadataText(metadata, 'thumbnailUrl') || metadataText(metadata, 'previewUrl') || asset.thumbnailUrl || ''
  return url ? normalizePublicMediaUrl(url) : ''
}

function assetTypeLabel(type: AssetType) {
  const map: Record<AssetType, string> = {
    TEXT: '文本',
    IMAGE: '图片',
    AUDIO: '音频',
    VIDEO: '视频',
    COVER: '封面',
    JSON: 'JSON',
  }
  return map[type] || type
}

function sourceLabel(asset: AssetItem) {
  return asset.assetGroup || asset.sourceType || '素材'
}

function formatDate(value?: string | null) {
  if (!value) return '暂无时间'
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '暂无时间'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function assetSearchText(asset: AssetItem) {
  return [
    assetWorkflowDisplayTitle(asset),
    assetWorkflowDisplayMeta(asset),
    asset.fileName,
    asset.assetType,
    asset.kind,
    asset.sourceType,
    asset.assetGroup,
    asset.metadataJson,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function hasAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token.toLowerCase()))
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function metadataText(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function numberMetadata(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

watch(
  () => filters.scope,
  () => {
    void loadAssets()
  },
)

onMounted(loadAssets)
</script>

<style scoped>
.asset-reuse-page {
  display: block;
  width: min(1450px, calc(100% - 48px));
  margin: 22px auto 42px;
  color: #101828;
  letter-spacing: 0;
}

.asset-reuse-redesign {
  display: grid;
  gap: 16px;
}

.asset-reuse-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 86px;
  text-align: center;
}

.asset-title-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
}

.asset-back {
  display: grid;
  width: 24px;
  height: 32px;
  place-items: center;
  color: #a8b3c7;
  font-size: 30px;
  line-height: 1;
}

.asset-reuse-head h1 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.2;
}

.asset-head-tag {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.asset-title-line p {
  margin: 10px 0 0;
  color: #667085;
  font-size: 16px;
  font-weight: 650;
}

.asset-reuse-actions {
  position: absolute;
  top: 12px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.asset-reuse-actions :deep(.el-button) {
  min-height: 34px;
  border-radius: 7px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
}

.asset-steps {
  display: grid;
  width: min(740px, 100%);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  align-items: center;
  margin: 8px auto 0;
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px 18px;
}

.asset-step {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a95a8;
  font-weight: 850;
}

.asset-step:not(:last-child)::after {
  position: absolute;
  right: -50%;
  left: calc(50% + 48px);
  height: 1px;
  background: #c8d3e5;
  content: '';
}

.asset-step span {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid #bdc8dc;
  border-radius: 999px;
  background: #fff;
  color: #8a95a8;
  font-size: 13px;
  line-height: 1;
}

.asset-step.active {
  color: #1261ff;
}

.asset-step.active span {
  border-color: #1261ff;
  background: #1261ff;
  color: #fff;
}

.asset-page-note {
  margin: 0 0 4px;
  color: #667085;
  font-size: 14px;
  font-weight: 650;
  text-align: left;
}

.asset-reuse-alert {
  margin: 0;
}

.asset-reuse-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 20px;
  align-items: start;
}

.asset-stage-list {
  display: grid;
  gap: 16px;
}

.asset-stage-card,
.plan-preview-card,
.video-preview-card {
  border: 1px solid #dfe7f3;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 16px 42px rgba(16, 24, 40, 0.04);
}

.asset-stage-card {
  padding: 18px;
}

.stage-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
}

.stage-title > span,
.stage-title > div > span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 7px;
  background: #e8f1ff;
  color: #1261ff;
  font-size: 14px;
  font-weight: 900;
}

.stage-title h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.stage-title .link-action {
  margin-left: auto;
}

.link-action,
.preview-card-head button,
.preview-item button,
.selection-item button {
  border: 0;
  background: transparent;
  color: #1261ff;
  padding: 0;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.asset-source-tabs,
.asset-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.asset-source-tabs button,
.asset-type-tabs button {
  height: 34px;
  min-height: 34px;
  border: 1px solid #dbe5f5;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  padding: 0 22px;
  font-weight: 850;
  cursor: pointer;
}

.asset-source-tabs button.active,
.asset-type-tabs button.active {
  border-color: #1261ff;
  color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.12);
}

.asset-card-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  min-height: 86px;
}

.reuse-choice-card,
.reuse-shot-card,
.material-card,
.upload-tile,
.reuse-empty-card {
  position: relative;
  display: grid;
  min-width: 0;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #101828;
  text-align: left;
}

.reuse-choice-card,
.reuse-empty-card {
  min-height: 86px;
  align-content: center;
  gap: 8px;
  padding: 14px;
}

.reuse-choice-card {
  cursor: pointer;
}

.reuse-choice-card strong,
.reuse-shot-card strong,
.material-card strong {
  overflow: hidden;
  color: #101828;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reuse-choice-card span,
.reuse-choice-card small,
.reuse-shot-card small,
.material-card small,
.reuse-empty-card {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
}

.reuse-card-excerpt {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: normal;
}

.reuse-shot-card .reuse-card-excerpt,
.reuse-shot-card .reuse-card-actions {
  grid-column: 2;
}

.reuse-card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reuse-card-actions button {
  min-height: 28px;
  border: 1px solid #dbe5f5;
  border-radius: 6px;
  background: #f8fbff;
  color: #1261ff;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.reuse-card-actions button:hover {
  border-color: #1261ff;
  background: #eef4ff;
}

.reuse-choice-card--skeleton {
  pointer-events: none;
}

.reuse-choice-card--skeleton strong,
.reuse-choice-card--skeleton span:not(.shot-thumb):not(.material-preview),
.reuse-choice-card--skeleton small {
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(90deg, #edf3fb 0%, #f7faff 48%, #edf3fb 100%);
  color: transparent;
}

.reuse-choice-card--skeleton strong {
  width: 72%;
  height: 14px;
}

.reuse-choice-card--skeleton span:not(.shot-thumb):not(.material-preview) {
  width: 90%;
  height: 12px;
}

.reuse-choice-card--skeleton small {
  width: 56%;
  height: 10px;
}

.reuse-choice-card--skeleton .shot-thumb,
.reuse-choice-card--skeleton .material-preview {
  background: linear-gradient(135deg, #dbeafe 0%, #eef4ff 48%, #cbd5e1 100%);
}

.reuse-choice-card.selected,
.reuse-shot-card.selected,
.material-card.selected {
  border-color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.22), 0 10px 24px rgba(18, 97, 255, 0.08);
}

.reuse-choice-card.selected::after,
.reuse-shot-card.selected::after,
.material-card.selected::after {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #1261ff;
  content: '●';
  font-size: 13px;
}

.asset-card-row--story {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.reuse-shot-card {
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 10px;
  min-height: 76px;
  align-items: center;
  padding: 10px;
  cursor: pointer;
}

.reuse-shot-card small {
  grid-column: 2;
}

.shot-thumb {
  display: grid;
  width: 70px;
  height: 54px;
  grid-row: span 2;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #eef4ff;
  color: #1261ff;
}

.shot-thumb img,
.material-preview img,
.media-card img,
.video-preview-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-option-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.asset-stage-card--compact {
  min-height: 118px;
}

.compact-choice-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.asset-stage-card--compact .reuse-choice-card {
  min-height: 54px;
  padding: 10px 12px;
}

.media-card-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
}

.reuse-choice-card.muted {
  color: #6b7280;
  cursor: default;
}

.media-card {
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
}

.media-card img {
  width: 36px;
  height: 36px;
  border-radius: 999px;
}

.audio-card {
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
}

.audio-icon,
.music-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  font-weight: 900;
}

.audio-icon :deep(svg),
.music-icon :deep(svg),
.preview-icon :deep(svg),
.upload-tile :deep(svg),
.preview-placeholder :deep(svg),
.media-card-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.audio-icon {
  background: #7c3aed;
}

.music-icon {
  background: #11b981;
}

.stage-title--tools {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.stage-title--tools > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}

.asset-filter-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.asset-filter-tools :deep(.el-input) {
  width: 230px;
}

.asset-filter-tools :deep(.el-select) {
  width: 116px;
}

.asset-material-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  min-height: 120px;
}

.asset-material-grid--packages {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.upload-tile,
.material-card {
  min-height: 112px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
}

.vehicle-bundle-card {
  position: relative;
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  min-width: 0;
  min-height: 128px;
  align-items: center;
  gap: 14px;
  border: 1px solid #dfe7f3;
  border-radius: 8px;
  background: #fff;
  color: #101828;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.vehicle-bundle-card.selected {
  border-color: #1261ff;
  box-shadow: inset 0 0 0 1px rgba(18, 97, 255, 0.22), 0 10px 24px rgba(18, 97, 255, 0.08);
}

.vehicle-bundle-card.selected::after {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #1261ff;
  content: '●';
  font-size: 13px;
}

.vehicle-bundle-preview {
  display: grid;
  width: 116px;
  aspect-ratio: 1.45;
  place-items: center;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 48%, #cbd5e1 100%);
  color: #1261ff;
}

.vehicle-bundle-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vehicle-bundle-body {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.vehicle-bundle-body strong {
  overflow: hidden;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-bundle-body small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vehicle-bundle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vehicle-bundle-tags em {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  padding: 0 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 850;
}

.upload-tile {
  border-style: dashed;
}

.upload-tile span {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: #eef4ff;
  color: #1261ff;
  line-height: 1;
}

.upload-tile strong {
  color: #667085;
  font-size: 14px;
  font-weight: 850;
}

.material-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 1.45;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: #eef4ff;
  color: #1261ff;
}

.material-card strong {
  display: block;
  width: 100%;
  min-width: 0;
}

.material-empty {
  grid-column: span 3;
}

.asset-preview-rail {
  position: sticky;
  top: 18px;
  display: grid;
  gap: 16px;
}

.plan-preview-card,
.video-preview-card {
  padding: 18px;
}

.preview-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
}

.preview-card-head h2,
.video-preview-card h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
}

.preview-card-head button {
  color: #667085;
}

.preview-list {
  display: grid;
  gap: 16px;
}

.preview-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.preview-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #eef4ff;
  color: #1261ff;
  font-weight: 900;
}

.preview-icon.indigo {
  background: #edf0ff;
  color: #4f46e5;
}

.preview-icon.avatar {
  background: #fff2e6;
  color: #f97316;
}

.preview-icon.voice {
  background: #f3e8ff;
  color: #9333ea;
}

.preview-icon.music {
  background: #e8f9f0;
  color: #10b981;
}

.preview-icon.material {
  background: #e9faf7;
  color: #0f9f96;
}

.preview-item strong,
.selection-item strong {
  display: block;
  overflow: hidden;
  color: #101828;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-item p {
  overflow: hidden;
  margin: 4px 0 0;
  color: #667085;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-list {
  display: grid;
  max-height: 260px;
  gap: 10px;
  overflow: auto;
  margin-top: 18px;
  border-top: 1px solid #edf1f7;
  padding-top: 14px;
}

.selection-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  border: 1px solid #e7edf7;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.selection-item span {
  color: #667085;
  font-size: 12px;
}

.selection-item button {
  justify-self: end;
  color: #ef4444;
}

.selection-cover-button {
  justify-self: start !important;
  min-height: 28px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #f8fbff;
  color: #1261ff !important;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.selection-cover-button.active {
  border-color: #1261ff;
  background: #e8f1ff;
}

.selection-cover-button:disabled {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #a8b3c7 !important;
  cursor: not-allowed;
}

.video-preview-frame {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe, #f8fafc 56%, #e2e8f0);
}

.preview-placeholder {
  display: grid;
  justify-items: center;
  gap: 10px;
  color: #475569;
}

.preview-placeholder span {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.68);
  color: #fff;
  font-size: 22px;
}

.preview-placeholder strong {
  font-size: 14px;
}

.preview-meta {
  display: grid;
  gap: 8px;
  margin: 12px 0 14px;
  color: #667085;
  font-size: 13px;
  font-weight: 700;
}

.draft-prompt {
  margin-bottom: 14px;
}

.selection-submit,
.save-draft-button {
  width: 100%;
  min-height: 40px;
  font-weight: 900;
}

.save-draft-button {
  margin-top: 10px;
}

.video-preview-card > p {
  margin: 12px 0 0;
  color: #8a95a8;
  font-size: 12px;
  line-height: 1.6;
}

.asset-text-preview-state {
  display: grid;
  min-height: 120px;
  place-items: center;
  border: 1px dashed #d8e2f0;
  border-radius: 8px;
  background: #f8fbff;
  color: #667085;
  font-size: 14px;
  font-weight: 750;
}

.asset-text-preview-state--error {
  border-color: #fecdd3;
  background: #fff5f5;
  color: #be123c;
}

.asset-text-preview-body {
  max-height: min(60vh, 560px);
  overflow: auto;
  margin: 0;
  border: 1px solid #e6eefb;
  border-radius: 8px;
  background: #fbfdff;
  color: #1f2937;
  padding: 14px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .asset-reuse-shell {
    grid-template-columns: 1fr;
  }

  .asset-preview-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .asset-reuse-page {
    width: calc(100% - 28px);
  }

  .asset-reuse-head,
  .stage-title--tools {
    align-items: stretch;
    flex-direction: column;
  }

  .asset-reuse-actions {
    position: static;
    justify-content: center;
    flex-wrap: wrap;
  }

  .asset-steps {
    margin-left: 0;
  }

  .asset-card-row,
  .asset-card-row--story,
  .asset-option-grid,
  .asset-material-grid,
  .asset-preview-rail {
    grid-template-columns: 1fr;
  }

  .asset-filter-tools {
    justify-content: stretch;
  }

  .asset-filter-tools :deep(.el-input),
  .asset-filter-tools :deep(.el-select) {
    width: 100%;
  }
}
</style>

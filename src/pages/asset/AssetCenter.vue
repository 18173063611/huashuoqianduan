<template>
  <section class="asset-center-panel" :class="{ 'asset-center-panel--embed': embedPanel }">
    <div class="asset-center-head">
      <div>
        <h2>{{ headTitle }}</h2>
        <p>{{ headSubtitle }}</p>
      </div>

      <div class="asset-header-actions">
        <div v-if="showCategoryTabs" class="asset-category-segment" role="tablist" aria-label="资产分类">
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': activeCategory === 'materials' }"
            role="tab"
            :aria-selected="activeCategory === 'materials'"
            :disabled="loading"
            @click="activeCategory = 'materials'"
          >
            素材资产
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': activeCategory === 'voices' }"
            role="tab"
            :aria-selected="activeCategory === 'voices'"
            :disabled="loading"
            @click="activeCategory = 'voices'"
          >
            音色库
          </button>
        </div>

        <div
          v-if="activeCategory === 'voices'"
          class="asset-scope-segment"
          role="tablist"
          aria-label="音色库范围"
        >
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': voiceListScope === 'private' }"
            role="tab"
            :aria-selected="voiceListScope === 'private'"
            :disabled="loading"
            @click="voiceListScope = 'private'"
          >
            私人音色库
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': voiceListScope === 'public' }"
            role="tab"
            :aria-selected="voiceListScope === 'public'"
            :disabled="loading"
            @click="voiceListScope = 'public'"
          >
            公共音色库
          </button>
        </div>

        <div v-if="activeCategory === 'materials'" class="asset-scope-segment" role="tablist" aria-label="资产范围">
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'global' }"
            role="tab"
            :aria-selected="listScope === 'global'"
            :disabled="loading"
            @click="listScope = 'global'"
          >
            公共素材
          </button>
          <button
            type="button"
            class="asset-scope-btn"
            :class="{ 'asset-scope-btn-active': listScope === 'private' }"
            role="tab"
            :aria-selected="listScope === 'private'"
            :disabled="loading"
            @click="listScope = 'private'"
          >
            私有素材
          </button>
        </div>

        <select v-if="activeCategory === 'materials'" v-model="selectedType" class="asset-type-select" :disabled="loading">
          <option value="">全部类型</option>
          <option value="TEXT">TEXT 文本</option>
          <option value="IMAGE">IMAGE 图片</option>
          <option value="AUDIO">AUDIO 音频</option>
          <option value="VIDEO">VIDEO 视频</option>
          <option value="COVER">COVER 封面</option>
          <option value="JSON">JSON 数据</option>
        </select>
        <select v-if="activeCategory === 'materials'" v-model="selectedSourceType" class="asset-type-select" :disabled="loading">
          <option value="">全部来源</option>
          <option v-for="item in sourceTypeOptions" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-if="activeCategory === 'materials'" v-model="sortKey" class="asset-type-select" :disabled="loading">
          <option value="createdAtDesc">按时间（新到旧）</option>
          <option value="createdAtAsc">按时间（旧到新）</option>
          <option value="fileNameAsc">按文件名（A到Z）</option>
          <option value="fileSizeDesc">按大小（大到小）</option>
        </select>
        <input
          v-model="keyword"
          class="asset-search"
          type="search"
          :disabled="loading"
          :placeholder="activeCategory === 'materials' ? '搜索文件名...' : '搜索音色名称或 voice_type...'"
        />
        <button class="app-secondary-button" type="button" :disabled="loading" @click="refreshCurrent">
          {{ loading ? '加载中...' : '刷新' }}
        </button>
      </div>
    </div>

    <div class="app-selected-project">
      <template v-if="activeCategory === 'voices' && voiceListScope === 'private'">
        私人音色库 · <strong>当前账号</strong>
        <span class="asset-count">共 {{ filteredVoices.length }} 条</span>
      </template>
      <template v-else-if="activeCategory === 'voices'">
        公共音色库 · <strong>浏览并加入私人库</strong>
        <span class="asset-count">共 {{ filteredVoices.length }} 条</span>
      </template>
      <template v-else-if="listScope === 'global'">
        公共素材 · <strong>全员可见</strong>
      </template>
      <template v-else-if="activeCategory === 'materials'">
        私有素材 · <strong>当前账号下上传/生成</strong>
      </template>
      <span v-if="activeCategory === 'materials'" class="asset-count">共 {{ assets.length }} 条</span>
    </div>

    <p v-if="jumpHint" class="asset-jump-hint app-muted">{{ jumpHint }}</p>
    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

    <div
      v-if="activeCategory === 'voices' && voiceListScope === 'private' && !hasToken"
      class="app-empty asset-empty"
    >
      <div class="asset-empty-title">请先登录</div>
      <div class="asset-empty-subtitle">登录后可查看与管理私人音色库（与语音生成页同步）。</div>
      <button class="app-primary-button asset-empty-action" type="button" @click="jumpHint = '请先登录后再查看私人音色库。'">
        去登录
      </button>
    </div>

    <div
      v-else-if="activeCategory === 'voices' && filteredVoices.length === 0"
      class="app-empty asset-empty"
    >
      <div class="asset-empty-title">暂无匹配音色</div>
      <div class="asset-empty-subtitle">可换一个关键词搜索。</div>
    </div>

    <div v-else-if="activeCategory === 'voices'" class="voice-library-list">
      <div v-for="voice in filteredVoices" :key="voice.voiceId" class="voice-library-item">
        <div class="voice-library-main">
          <strong>{{ voice.voiceName }}</strong>
          <p>{{ voice.gender || '未知' }} · {{ voice.scene || '通用口播' }}</p>
          <code>{{ voice.providerVoiceId }}</code>
        </div>
        <div class="asset-row-actions">
          <button class="app-secondary-button" type="button" :disabled="loading" @click="playVoiceSample(voice)">试听</button>
          <template v-if="voiceListScope === 'private'">
            <button class="app-secondary-button" type="button" :disabled="loading" @click="goVoiceTtsWithPreset(voice)">
              去声音生成
            </button>
            <button
              class="app-secondary-button asset-danger"
              type="button"
              :disabled="loading"
              @click="handleRemoveVoiceFromLibrary(voice)"
            >
              删除
            </button>
          </template>
          <template v-else>
            <button
              v-if="hasToken"
              class="app-secondary-button"
              type="button"
              :disabled="loading"
              @click="handleAddVoiceToLibrary(voice)"
            >
              加入私人音色库
            </button>
            <button class="app-secondary-button" type="button" :disabled="loading" @click="goVoiceTtsWithPreset(voice)">
              去声音生成
            </button>
          </template>
        </div>
      </div>
    </div>

    <div v-else-if="assets.length === 0" class="app-empty asset-empty">
      <div class="asset-empty-title">暂无资产</div>
      <div class="asset-empty-subtitle">{{ emptySubtitle }}</div>
      <button
        v-if="listScope === 'private' && !hasToken"
        class="app-primary-button asset-empty-action"
        type="button"
        @click="jumpHint = '请先登录后再查看私有资产。'"
      >
        去登录
      </button>
    </div>

    <div v-else class="app-file-list asset-file-list">
      <div
        v-for="asset in assets"
        :id="assetRowDomId(asset.assetId)"
        :key="asset.assetId"
        class="app-file-item"
        :class="{ 'asset-row-highlight': highlightedId === asset.assetId }"
      >
        <div class="asset-row-main">
          <strong class="asset-row-title">{{ displayAssetTitle(asset) }}</strong>
          <p class="asset-row-meta">
            {{ displayAssetMeta(asset) }}
            <template v-if="asset.createdAt"> · {{ formatTime(asset.createdAt) }}</template>
          </p>
          <div class="asset-row-preview">
            <template v-if="isImage(asset)">
              <img :src="resolveFileUrl(asset.thumbnailUrl || asset.fileUrl)" alt="asset preview" />
            </template>
            <template v-else-if="isAudio(asset)">
              <audio :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
            </template>
            <template v-else-if="isVideo(asset)">
              <video :src="resolveFileUrl(asset.fileUrl)" controls preload="none" />
            </template>
            <template v-else-if="isJson(asset)">
              <div class="asset-result-card">
                <strong>{{ resultAssetLabel(asset) }}</strong>
                <span>点击预览查看结构化结果。</span>
              </div>
            </template>
            <template v-else>
              <span class="app-muted">此类型建议点击“预览”查看。</span>
            </template>
          </div>
        </div>

        <div class="asset-row-actions">
          <button
            v-if="isJson(asset)"
            class="app-secondary-button asset-open"
            type="button"
            :disabled="previewLoading"
            @click="openAssetPreview(asset)"
          >
            {{ previewLoading && previewAsset?.assetId === asset.assetId ? '加载中...' : '预览' }}
          </button>
          <a v-else class="app-secondary-button asset-open" :href="resolveFileUrl(asset.fileUrl)" target="_blank" rel="noreferrer">预览</a>
          <button class="app-secondary-button" type="button" @click="copyLink(asset)">复制链接</button>
          <button
            v-if="listScope === 'global' && hasToken"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handleSave(asset)"
          >
            保存到私有
          </button>
          <button
            v-if="listScope === 'private' && hasToken"
            class="app-secondary-button"
            type="button"
            :disabled="loading"
            @click="handlePublish(asset)"
          >
            发布到公共
          </button>
          <button
            v-if="listScope === 'global' && hasToken && canUnpublish(asset)"
            class="app-secondary-button asset-danger"
            type="button"
            :disabled="loading"
            @click="handleUnpublish(asset)"
          >
            下架
          </button>
          <button
            v-if="asset.metadataJson"
            class="app-secondary-button"
            type="button"
            @click="openMetadata(asset)"
          >
            metadata
          </button>
          <button
            v-if="listScope === 'private' && asset.ownerUserId != null"
            class="app-secondary-button asset-danger"
            type="button"
            title="删除该私有资产（不可恢复）"
            :disabled="loading"
            @click="handleDelete(asset)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="metadataModalOpen" class="asset-modal-backdrop" @click.self="closeMetadata">
      <div class="asset-modal">
        <div class="asset-modal-header">
          <strong>metadataJson</strong>
          <button class="app-secondary-button" type="button" @click="closeMetadata">关闭</button>
        </div>
        <p class="app-muted asset-modal-subtitle">{{ metadataTitle }}</p>
        <pre class="asset-modal-code">{{ metadataPretty }}</pre>
        <div class="asset-modal-actions">
          <button class="app-secondary-button" type="button" @click="copyMetadata">复制</button>
          <a class="app-secondary-button asset-open" :href="metadataLink" target="_blank" rel="noreferrer">打开预览</a>
        </div>
      </div>
    </div>

    <div v-if="previewModalOpen" class="asset-modal-backdrop" @click.self="closeAssetPreview">
      <section class="asset-preview-modal" role="dialog" aria-modal="true" aria-label="资产预览">
        <header class="asset-modal-header asset-preview-head">
          <div>
            <strong>{{ previewAsset ? resultAssetLabel(previewAsset) : '结果预览' }}</strong>
            <p v-if="previewAsset" class="app-muted asset-modal-subtitle">
              {{ displayAssetPreviewSubtitle(previewAsset) }}
            </p>
          </div>
          <button class="app-secondary-button" type="button" @click="closeAssetPreview">关闭</button>
        </header>

        <p v-if="previewError" class="app-error">{{ previewError }}</p>
        <div v-else-if="previewLoading" class="asset-preview-empty">正在加载预览...</div>

        <template v-else>
          <div v-if="previewScriptShots.length" class="asset-preview-storyboard">
            <div class="asset-preview-toolbar">
              <label for="asset-preview-shot-select">查看场景</label>
              <select id="asset-preview-shot-select" v-model.number="previewShotIndex">
                <option :value="-1">全部场景（共 {{ previewScriptShots.length }} 个）</option>
                <option v-for="(shot, index) in previewScriptShots" :key="`${shot.order}-${shot.time}`" :value="index">
                  场景{{ orderLabel(shot.order) }}{{ shot.time ? ` · ${shot.time}` : '' }}
                </option>
              </select>
            </div>
            <div class="asset-preview-table-wrap">
              <table class="asset-preview-table">
                <thead>
                  <tr>
                    <th>场景</th>
                    <th>时间</th>
                    <th>画面</th>
                    <th>台词</th>
                    <th>拍摄技巧</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="shot in displayedPreviewScriptShots" :key="`${shot.order}-${shot.time}`">
                    <td>场景{{ orderLabel(shot.order) }}</td>
                    <td>{{ shot.time || '-' }}</td>
                    <td>
                      <div class="asset-preview-cell-text">{{ shot.page || '-' }}</div>
                      <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="asset-preview-bgm">
                        {{ shot.backgroundMusic }}
                      </p>
                    </td>
                    <td>{{ shot.content || '-' }}</td>
                    <td>{{ shot.highlight || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="previewStoryboardShots.length" class="asset-preview-shot-grid">
            <article v-for="shot in previewStoryboardShots" :key="shot.index" class="asset-preview-shot-card">
              <span>镜头 {{ shot.index }}</span>
              <strong>{{ shot.visual || '画面描述' }}</strong>
              <p>{{ shot.narration || '暂无旁白' }}</p>
              <small>预计 {{ shot.estDurationSec || 0 }} 秒</small>
            </article>
          </div>

          <div v-else-if="isBenchmarkPreview" class="asset-preview-benchmark">
            <article class="asset-preview-video-info">
              <img v-if="benchmarkParse.coverUrl" :src="benchmarkParse.coverUrl" alt="对标视频封面" />
              <div v-else class="asset-preview-cover-placeholder">AI</div>
              <div>
                <strong>{{ benchmarkParse.title || '对标视频信息' }}</strong>
                <p>{{ benchmarkParse.authorName || '对标账号' }}</p>
                <small>
                  <template v-if="benchmarkParse.durationText">时长 {{ benchmarkParse.durationText }}</template>
                  <template v-if="benchmarkParse.videoId"> · 视频 ID {{ benchmarkParse.videoId }}</template>
                </small>
              </div>
            </article>
            <section class="asset-preview-text-panel">
              <h4>ASR 原文案</h4>
              <p>{{ benchmarkTranscriptText || '暂无转写原文。' }}</p>
            </section>
          </div>

          <div v-else-if="rewritePreviewText" class="asset-preview-text-panel">
            <h4>{{ rewritePreviewTitle }}</h4>
            <p>{{ rewritePreviewText }}</p>
          </div>

          <div v-else class="asset-preview-empty">该结果暂无可视化预览。</div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { deleteAsset, getAssets, getAssetTextContent, publishAsset, saveAsset, unpublishAsset } from '../../services/assetApi'
import type { AssetListScope, AssetListSort } from '../../services/assetApi'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import type { AssetItem, AssetType } from '../../types/assetTypes'
import {
  addVoiceToMyLibrary,
  createVoiceSampleTask,
  getVoiceCatalog,
  getVoicePresets,
  removeVoiceFromMyLibrary,
} from '../../services/voiceApi'
import { getTaskDetail, getTaskResult, newIdempotencyKey } from '../../services/taskApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { VOICE_PRESET_SELECTION_KEY, type VoicePresetItem } from '../../types/voiceTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'

const props = defineProps<{
  /** 从任务中心等入口跳转时，高亮并滚动到该资产 */
  highlightAssetId?: number | null
  /**
   * full：保留「素材资产 / 音色库」一级切换。
   * materials | voices：仅展示对应面板（用于资产中心页一级 Tab 内嵌）。
   */
  panelMode?: 'full' | 'materials' | 'voices'
}>()

const emit = defineEmits<{
  highlightConsumed: []
  voiceSelected: []
}>()

interface PreviewScriptShot {
  order: number
  time: string
  content: string
  backgroundMusic: string
  page: string
  highlight: string
}

interface PreviewStoryboardShot {
  index: number
  visual: string
  narration: string
  estDurationSec: number
}

const router = useRouter()

const embedPanel = computed(() => props.panelMode === 'materials' || props.panelMode === 'voices')
const showCategoryTabs = computed(() => !props.panelMode || props.panelMode === 'full')

const headTitle = computed(() => {
  if (props.panelMode === 'materials') return '素材资产'
  if (props.panelMode === 'voices') return voicesHeadTitle.value
  return activeCategory.value === 'materials' ? '素材资产' : voicesHeadTitle.value
})

const headSubtitle = computed(() => {
  if (props.panelMode === 'materials') {
    return '筛选公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
  }
  if (props.panelMode === 'voices') {
    return voicesHeadSubtitle.value
  }
  return activeCategory.value === 'materials'
    ? '筛选公共或私有素材，预览、复制链接，并管理当前账号下的资产。'
    : voicesHeadSubtitle.value
})

const KNOWN_SOURCE_TYPES = [
  'AI_GENERATED',
  'DEMO',
  'MANUAL_CREATED',
  'SYSTEM_MOCK',
  'USER_UPLOAD',
  'SCRIPT_REWRITE',
  'STORYBOARD_GENERATE',
  'VIDEO_PARSE',
  'VIDEO_SCRIPT_ANALYZE',
  'VIDEO_SCRIPT_URL_ANALYZE',
  'DOUYIN_BENCHMARK',
  'DOUYIN_PARSE_TRANSCRIPT',
  'DOUYIN_REWRITE',
  'DOUYIN_TRANSCRIPT',
  'TTS_GENERATE',
  'VOICE_SAMPLE',
  'AVATAR_GENERATE',
  'DIGITAL_HUMAN_GENERATE',
  'SEEDANCE_TEXT_VIDEO',
  'SEEDANCE_FIRST_FRAME_VIDEO',
  'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
  'SEEDANCE_REFERENCE_VIDEO',
  'TEXT_TO_VIDEO_SEEDANCE_1_5',
  'TEXT_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_1_5',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
] as const

const assets = ref<AssetItem[]>([])
const voices = ref<VoicePresetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const highlightedId = ref<number | null>(null)
const jumpHint = ref('')
const selectedType = ref<'' | AssetType>('')
const selectedSourceType = ref<string>('')
const sortKey = ref<AssetListSort>('createdAtDesc')
const keyword = ref('')
const listScope = ref<AssetListScope>('global')
const activeCategory = ref<'materials' | 'voices'>('materials')
const voiceListScope = ref<'private' | 'public'>('private')
const hasToken = ref(false)
let keywordReloadTimer: number | null = null
let highlightClearTimer: number | null = null

watch(
  () => props.panelMode,
  (m) => {
    if (m === 'materials') {
      activeCategory.value = 'materials'
    } else if (m === 'voices') {
      activeCategory.value = 'voices'
    }
  },
  { immediate: true },
)

const metadataModalOpen = ref(false)
const metadataPretty = ref('')
const metadataTitle = ref('')
const metadataLink = ref('#')
const previewModalOpen = ref(false)
const previewLoading = ref(false)
const previewError = ref('')
const previewAsset = ref<AssetItem | null>(null)
const previewPayload = ref<unknown>(null)
const previewShotIndex = ref(-1)

const voicesHeadTitle = computed(() =>
  activeCategory.value === 'voices'
    ? voiceListScope.value === 'private'
      ? '私人音色库'
      : '公共音色库'
    : '',
)

const voicesHeadSubtitle = computed(() =>
  voiceListScope.value === 'private'
    ? '与语音生成页列表一致；默认三条可在移除后从公共库再添加。'
    : '浏览全部已启用音色，可加入私人库后在语音合成中使用。',
)

const emptySubtitle = computed(() => {
  if (listScope.value === 'private' && !hasToken.value) {
    return '请先登录，再查看与当前账号绑定的私有资产。'
  }
  if (listScope.value === 'private') {
    return '当前账号下尚无私有资产，可在各模块上传或生成后查看。'
  }
  return '当前没有符合条件的公共素材。'
})

const sourceTypeOptions = computed(() => {
  const set = new Set<string>(KNOWN_SOURCE_TYPES)
  for (const asset of assets.value) {
    if (asset.sourceType) {
      set.add(asset.sourceType)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const filteredVoices = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) {
    return voices.value
  }
  return voices.value.filter((voice) => {
    return (
      voice.voiceName.toLowerCase().includes(q) ||
      voice.providerVoiceId.toLowerCase().includes(q) ||
      (voice.gender || '').toLowerCase().includes(q) ||
      (voice.scene || '').toLowerCase().includes(q)
    )
  })
})

const previewRecord = computed(() => (isRecord(previewPayload.value) ? previewPayload.value : null))

const previewTaskType = computed(() => {
  const asset = previewAsset.value
  const metadata = asset ? parseJsonObject(asset.metadataJson) : null
  const fromMeta = stringField(metadata, 'taskType')
  const fromPayload = stringField(previewRecord.value, 'taskType')
  const sourceType = asset?.sourceType || ''
  if (fromMeta) return fromMeta
  if (fromPayload) return fromPayload
  if (sourceType === 'DOUYIN_BENCHMARK') return 'DOUYIN_PARSE_TRANSCRIPT'
  return sourceType
})

const previewScriptShots = computed<PreviewScriptShot[]>(() => {
  const scripts = previewRecord.value?.scripts
  return Array.isArray(scripts)
    ? scripts.filter(isPreviewScriptShot).sort((a, b) => a.order - b.order)
    : []
})

const displayedPreviewScriptShots = computed(() => {
  const list = previewScriptShots.value
  const index = previewShotIndex.value
  if (index < 0 || index >= list.length) {
    return list
  }
  return [list[index]]
})

const previewStoryboardShots = computed<PreviewStoryboardShot[]>(() => {
  const storyboard = previewRecord.value?.storyboard
  return Array.isArray(storyboard)
    ? storyboard.filter(isPreviewStoryboardShot).sort((a, b) => a.index - b.index)
    : []
})

const benchmarkParse = computed(() => {
  const parseResult = isRecord(previewRecord.value?.parseResult) ? previewRecord.value.parseResult : null
  const author = isRecord(parseResult?.author) ? parseResult.author : null
  const durationSeconds = numberField(parseResult, 'durationSeconds')
  return {
    coverUrl: stringField(parseResult, 'coverUrl'),
    title: stringField(parseResult, 'title'),
    videoId: stringField(parseResult, 'videoId'),
    authorName: stringField(author, 'nickname'),
    durationText: durationSeconds > 0 ? formatDuration(durationSeconds) : '',
  }
})

const benchmarkTranscriptText = computed(() => {
  const transcript = isRecord(previewRecord.value?.transcriptResult) ? previewRecord.value.transcriptResult : null
  return stringField(transcript, 'originalText')
})

const isBenchmarkPreview = computed(() => {
  const type = previewTaskType.value
  return type === 'DOUYIN_PARSE_TRANSCRIPT' || previewAsset.value?.sourceType === 'DOUYIN_BENCHMARK'
})

const rewritePreviewText = computed(() => {
  const record = previewRecord.value
  return (
    stringField(record, 'rewrittenText') ||
    stringField(record, 'translatedText') ||
    stringField(record, 'originalText')
  )
})

const rewritePreviewTitle = computed(() => {
  const type = previewTaskType.value
  if (type === 'DOUYIN_TRANSCRIPT') return '转写原文'
  if (type === 'DOUYIN_REWRITE') return '改写后文案'
  return '生成文案'
})

onMounted(() => {
  void refreshCurrent()
})

watch([activeCategory, listScope, voiceListScope, selectedType, selectedSourceType, sortKey], () => {
  scheduleReload()
})

watch(keyword, () => {
  scheduleKeywordReload()
})

watch(
  () => props.highlightAssetId,
  async (id) => {
    if (id == null || id <= 0) {
      return
    }
    await nextTick()
    applyHighlightWhenReady(id)
  },
)

onBeforeUnmount(() => {
  clearHighlightTimer()
  clearKeywordReloadTimer()
})

function scheduleReload() {
  if (loading.value) {
    return
  }
  void refreshCurrent()
}

function scheduleKeywordReload() {
  clearKeywordReloadTimer()
  keywordReloadTimer = window.setTimeout(() => {
    keywordReloadTimer = null
    void loadAssets()
  }, 320)
}

async function loadAssets() {
  loading.value = true
  errorMessage.value = ''
  hasToken.value = !!getAuthToken()
  try {
    if (activeCategory.value === 'voices') {
      if (voiceListScope.value === 'private') {
        if (!getAuthToken()) {
          voices.value = []
          return
        }
        const res = await getVoicePresets()
        voices.value = res.records || []
        return
      }
      const res = await getVoiceCatalog()
      voices.value = res.records || []
      return
    }
    assets.value = await getAssets({
      scope: listScope.value,
      assetType: selectedType.value || undefined,
      sourceType: selectedSourceType.value || undefined,
      keyword: keyword.value || undefined,
      sort: sortKey.value,
    })
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载资产失败'
  } finally {
    loading.value = false
    await nextTick()
    if (props.highlightAssetId != null && props.highlightAssetId > 0) {
      applyHighlightWhenReady(props.highlightAssetId)
    }
  }
}

function refreshCurrent() {
  void loadAssets()
}

function clearKeywordReloadTimer() {
  if (keywordReloadTimer != null) {
    window.clearTimeout(keywordReloadTimer)
    keywordReloadTimer = null
  }
}

function clearHighlightTimer() {
  if (highlightClearTimer != null) {
    window.clearTimeout(highlightClearTimer)
    highlightClearTimer = null
  }
}

function applyHighlightWhenReady(assetId: number) {
  if (loading.value) {
    return
  }
  const found = assets.value.some((asset) => asset.assetId === assetId)
  if (!found) {
    jumpHint.value = '该资产不在当前列表中，可切换范围或刷新后再试。'
    emit('highlightConsumed')
    return
  }
  jumpHint.value = '已定位到任务产出的素材。'
  highlightedId.value = assetId
  clearHighlightTimer()
  void nextTick().then(() => {
    document.getElementById(assetRowDomId(assetId))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  highlightClearTimer = window.setTimeout(() => {
    highlightedId.value = null
    jumpHint.value = ''
    highlightClearTimer = null
    emit('highlightConsumed')
  }, 6000)
}

function assetRowDomId(assetId: number) {
  return `asset-row-${assetId}`
}

function resolveFileUrl(url: string) {
  if (!url) {
    return '#'
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function isImage(asset: AssetItem) {
  return asset.assetType === 'IMAGE' || asset.assetType === 'COVER' || (asset.mimeType || '').startsWith('image/')
}

function isAudio(asset: AssetItem) {
  return asset.assetType === 'AUDIO' || (asset.mimeType || '').startsWith('audio/')
}

function isVideo(asset: AssetItem) {
  return asset.assetType === 'VIDEO' || (asset.mimeType || '').startsWith('video/')
}

function isJson(asset: AssetItem) {
  return (
    asset.assetType === 'JSON' ||
    (asset.mimeType || '').toLowerCase().includes('json') ||
    asset.fileName.toLowerCase().endsWith('.json')
  )
}

function resultAssetLabel(asset: AssetItem) {
  const type = assetTaskType(asset)
  const label = taskTypeLabel(type)
  if (label && label !== '其他任务' && label !== '暂无') {
    return `${label}结果`
  }
  return asset.sourceType ? `${asset.sourceType} 结果` : '生成结果'
}

function displayAssetTitle(asset: AssetItem) {
  if (isJson(asset) && asset.kind === 'GENERATED') {
    return resultAssetLabel(asset)
  }
  return asset.fileName
}

function displayAssetMeta(asset: AssetItem) {
  if (isJson(asset) && asset.kind === 'GENERATED') {
    const type = assetTaskType(asset)
    const label = taskTypeLabel(type)
    const readable = label && label !== '其他任务' && label !== '暂无' ? label : asset.sourceType
    return readable ? `生成结果 · ${readable}` : '生成结果'
  }
  return `${asset.assetType} · ${formatFileSize(asset.fileSize)} · ${asset.sourceType}`
}

function displayAssetPreviewSubtitle(asset: AssetItem) {
  if (isJson(asset) && asset.kind === 'GENERATED') {
    return displayAssetMeta(asset)
  }
  return `${asset.fileName} · ${asset.sourceType}`
}

function assetTaskType(asset: AssetItem | null) {
  if (!asset) {
    return ''
  }
  const metadata = parseJsonObject(asset.metadataJson)
  const fromMeta = stringField(metadata, 'taskType')
  if (fromMeta) {
    return fromMeta
  }
  if (asset.sourceType === 'DOUYIN_BENCHMARK') {
    return 'DOUYIN_PARSE_TRANSCRIPT'
  }
  return asset.sourceType || ''
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

function formatTime(value: string) {
  return value.replace('T', ' ').slice(0, 19)
}

async function copyLink(asset: AssetItem) {
  const url = resolveFileUrl(asset.fileUrl)
  try {
    await navigator.clipboard.writeText(url)
    jumpHint.value = '已复制预览链接。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制预览链接。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}

async function openAssetPreview(asset: AssetItem) {
  previewAsset.value = asset
  previewModalOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewPayload.value = null
  previewShotIndex.value = -1
  try {
    const text = await getAssetTextContent(asset)
    const parsed = parseJsonObject(text)
    previewPayload.value = parsed ?? { rewrittenText: text }
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : '加载预览失败'
  } finally {
    previewLoading.value = false
  }
}

function closeAssetPreview() {
  previewModalOpen.value = false
  previewLoading.value = false
  previewError.value = ''
  previewAsset.value = null
  previewPayload.value = null
  previewShotIndex.value = -1
}

async function handleDelete(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认删除该资产？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await deleteAsset(asset.assetId)
    assets.value = assets.value.filter((item) => item.assetId !== asset.assetId)
    if (highlightedId.value === asset.assetId) {
      highlightedId.value = null
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    loading.value = false
  }
}

async function handleSave(asset: AssetItem) {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await saveAsset(asset.assetId)
    jumpHint.value = '已保存到私有资产。'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    loading.value = false
  }
}

async function handlePublish(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认发布到公共素材？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await publishAsset(asset.assetId)
    jumpHint.value = '已发布到公共素材。'
    listScope.value = 'global'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '发布失败'
  } finally {
    loading.value = false
    void loadAssets()
  }
}

function canUnpublish(asset: AssetItem) {
  return asset.createdByUserId != null
}

async function handleUnpublish(asset: AssetItem) {
  if (loading.value) {
    return
  }
  const ok = window.confirm(`确认下架该公共素材？\n${asset.fileName}`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await unpublishAsset(asset.assetId)
    assets.value = assets.value.filter((item) => item.assetId !== asset.assetId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '下架失败'
  } finally {
    loading.value = false
  }
}

function openMetadata(asset: AssetItem) {
  metadataModalOpen.value = true
  metadataTitle.value = `${asset.fileName}（${asset.assetType} · ${asset.sourceType}）`
  metadataLink.value = resolveFileUrl(asset.fileUrl)
  metadataPretty.value = prettyJson(asset.metadataJson || '')
}

function closeMetadata() {
  metadataModalOpen.value = false
  metadataPretty.value = ''
  metadataTitle.value = ''
  metadataLink.value = '#'
}

function prettyJson(input: string) {
  if (!input || !input.trim()) {
    return ''
  }
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return input
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'string' ? raw : ''
}

function numberField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

function isPreviewScriptShot(value: unknown): value is PreviewScriptShot {
  return isRecord(value) && typeof value.order === 'number'
}

function isPreviewStoryboardShot(value: unknown): value is PreviewStoryboardShot {
  return isRecord(value) && typeof value.index === 'number'
}

function orderLabel(order: number) {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (order >= 1 && order <= labels.length) {
    return labels[order - 1]
  }
  return String(order)
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  const minute = Math.floor(safe / 60)
  const remain = String(safe % 60).padStart(2, '0')
  return `${minute}:${remain}`
}

async function copyMetadata() {
  if (!metadataPretty.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(metadataPretty.value)
    jumpHint.value = '已复制 metadataJson。'
    window.setTimeout(() => {
      if (jumpHint.value === '已复制 metadataJson。') {
        jumpHint.value = ''
      }
    }, 2500)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '复制失败'
  }
}

async function goVoiceTtsWithPreset(voice: VoicePresetItem) {
  if (getAuthToken()) {
    loading.value = true
    errorMessage.value = ''
    try {
      await addVoiceToMyLibrary(voice.voiceId)
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : '加入私人音色库失败'
      return
    } finally {
      loading.value = false
    }
  }
  window.localStorage.setItem(VOICE_PRESET_SELECTION_KEY, voice.providerVoiceId)
  emit('voiceSelected')
  void router.push({ name: 'voice' })
}

async function handleAddVoiceToLibrary(voice: VoicePresetItem) {
  if (!getAuthToken()) {
    jumpHint.value = '请先登录后再加入私人音色库。'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await addVoiceToMyLibrary(voice.voiceId)
    jumpHint.value = `已将「${voice.voiceName}」加入私人音色库。`
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加入失败'
  } finally {
    loading.value = false
  }
}

async function handleRemoveVoiceFromLibrary(voice: VoicePresetItem) {
  const ok = window.confirm(`从私人音色库移除「${voice.voiceName}」？`)
  if (!ok) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await removeVoiceFromMyLibrary(voice.voiceId)
    voices.value = voices.value.filter((v) => v.voiceId !== voice.voiceId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    loading.value = false
  }
}

async function playVoiceSample(voice: VoicePresetItem) {
  if (loading.value) {
    return
  }
  try {
    let sampleUrl = voice.sampleUrl
    if (!sampleUrl) {
      loading.value = true
      errorMessage.value = ''
      const sampleIdem = newIdempotencyKey()
      const created = await createVoiceSampleTask(voice.voiceId, { idempotencyKey: sampleIdem })
      rememberSessionTaskId(created.taskId)
      const maxAttempts = 40
      for (let i = 0; i < maxAttempts; i++) {
        const detail = await getTaskDetail(created.taskId)
        if (detail.status === 'SUCCESS') {
          const result = await getTaskResult<{ sampleUrl?: string; previewUrl?: string }>(created.taskId)
          sampleUrl = result.result?.sampleUrl || result.result?.previewUrl || ''
          break
        }
        if (['FAILED', 'RETRYABLE', 'CANCELED'].includes(String(detail.status))) {
          throw new Error(detail.errorMessage || '试听任务失败')
        }
        await new Promise((r) => window.setTimeout(r, 900))
      }
      loading.value = false
      if (sampleUrl) {
        const idx = voices.value.findIndex((v) => v.voiceId === voice.voiceId)
        if (idx >= 0) {
          voices.value[idx] = { ...voices.value[idx], sampleUrl }
        }
      }
    }
    if (!sampleUrl) {
      return
    }
    const url = sampleUrl.startsWith('http') ? sampleUrl : `${API_ORIGIN}${sampleUrl}`
    const a = new Audio(url)
    void a.play().catch(() => {})
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '试听失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.asset-center-panel {
  display: grid;
  gap: 14px;
}

.asset-center-head {
  display: grid;
  grid-template-columns: minmax(220px, 0.6fr) minmax(0, 1.4fr);
  gap: 18px;
  align-items: start;
}

.asset-center-head h2 {
  margin: 0 0 6px;
  color: #151a2d;
  font-size: 18px;
  font-weight: 850;
}

.asset-center-head p {
  margin: 0;
  max-width: 360px;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.asset-header-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(118px, 1fr)) minmax(180px, 1.2fr) auto;
  align-items: center;
  gap: 10px;
}

.asset-category-segment,
.asset-scope-segment {
  display: inline-flex;
  grid-column: 1 / -1;
  width: fit-content;
  padding: 3px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #eef0f6;
  gap: 2px;
}

.asset-category-segment {
  background: #f5f3ff;
  border-color: #e2ddff;
}

.asset-scope-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  background: transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.asset-scope-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.65);
  color: #111827;
}

.asset-scope-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.asset-scope-btn-active {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  color: #111827;
}

.asset-type-select,
.asset-search {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f5f6f8;
  color: #111827;
  outline: none;
}

.asset-type-select {
  padding: 0 12px;
}

.asset-search {
  padding: 0 12px 0 36px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M11 19a8 8 0 110-16 8 8 0 010 16z' stroke='%239CA3AF' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
}

.asset-type-select:focus,
.asset-search:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.1);
  background-color: #ffffff;
}

.asset-header-actions .app-secondary-button {
  min-width: 68px;
  height: 36px;
  white-space: nowrap;
}

.app-selected-project {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  border: 1px solid #e2ddff;
  border-radius: 10px;
  background: #f5f3ff;
  color: #635bff;
  padding: 10px 14px;
}

.asset-count {
  margin-left: 6px;
  color: #6b7280;
  font-size: 12px;
}

.asset-jump-hint {
  margin: 0;
  font-size: 13px;
}

.asset-file-list,
.asset-empty,
.voice-library-list {
  min-height: 300px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.asset-file-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.voice-library-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.voice-library-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px 16px;
}

.voice-library-main {
  min-width: 0;
}

.voice-library-main strong {
  display: block;
  color: #151a2d;
  font-size: 15px;
  font-weight: 850;
}

.voice-library-main p {
  margin: 6px 0;
  color: #667085;
  font-size: 13px;
}

.voice-library-main code {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-radius: 6px;
  background: #f1efff;
  color: #5e50df;
  padding: 4px 8px;
  text-overflow: ellipsis;
  vertical-align: top;
  white-space: nowrap;
}

.asset-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-top: 80px;
}

.asset-empty-title {
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.asset-empty-subtitle {
  color: #9ca3af;
  font-size: 12px;
}

.asset-empty-action {
  margin-top: 12px;
}

.asset-row-main {
  flex: 1;
  min-width: 0;
}

.asset-row-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-row-meta {
  margin: 6px 0 10px;
  color: #6b7280;
  font-size: 13px;
}

.asset-row-actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.asset-row-preview img {
  width: 240px;
  max-width: 100%;
  height: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
}

.asset-row-preview audio,
.asset-row-preview video {
  width: 320px;
  max-width: 100%;
}

.asset-result-card {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  max-width: 360px;
  border: 1px solid #e6e8f2;
  border-radius: 10px;
  background: #fbfcff;
  padding: 12px 14px;
}

.asset-result-card strong {
  color: #151a2d;
  font-size: 14px;
}

.asset-result-card span {
  color: #667085;
  font-size: 12px;
}

.asset-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.asset-danger {
  border-color: rgba(239, 68, 68, 0.45);
  color: #ef4444;
}

.asset-row-highlight {
  outline: 2px solid #7c6cff;
  outline-offset: 2px;
  background: rgba(124, 108, 255, 0.08);
}

.asset-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.7);
  padding: 18px;
}

.asset-modal {
  width: min(920px, 100%);
  max-height: min(78vh, 720px);
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.92);
  padding: 14px 14px 12px;
}

.asset-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(226, 232, 240, 0.95);
}

.asset-modal-subtitle {
  margin: 8px 0 10px;
  font-size: 13px;
}

.asset-modal-code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.55);
  color: rgba(226, 232, 240, 0.95);
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
}

.asset-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.asset-preview-modal {
  width: min(1100px, 100%);
  max-height: min(86vh, 820px);
  overflow: auto;
  border: 1px solid #e6e8f2;
  border-radius: 14px;
  background: #ffffff;
  padding: 18px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
}

.asset-preview-head {
  align-items: flex-start;
  color: #111827;
}

.asset-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.asset-preview-toolbar label {
  color: #475467;
  font-size: 13px;
  font-weight: 800;
}

.asset-preview-toolbar select {
  min-width: 260px;
  border: 1px solid #dfe3ee;
  border-radius: 10px;
  background: #fff;
  padding: 10px 12px;
  color: #111827;
  font-weight: 700;
}

.asset-preview-table-wrap {
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 12px;
}

.asset-preview-table {
  width: 100%;
  min-width: 840px;
  border-collapse: collapse;
  background: #fff;
}

.asset-preview-table th {
  background: #f8f9fd;
  color: #475467;
  padding: 12px;
  text-align: left;
  font-size: 12px;
}

.asset-preview-table td {
  border-top: 1px solid #edf0f6;
  padding: 12px;
  color: #1f2937;
  vertical-align: top;
  font-size: 13px;
  line-height: 1.55;
}

.asset-preview-cell-text {
  min-width: 180px;
}

.asset-preview-bgm {
  margin: 8px 0 0;
  color: #7c6cff;
  font-size: 12px;
}

.asset-preview-shot-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.asset-preview-shot-card {
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px;
}

.asset-preview-shot-card span,
.asset-preview-shot-card small {
  color: #667085;
  font-size: 12px;
}

.asset-preview-shot-card strong {
  display: block;
  margin: 8px 0;
  color: #111827;
  font-size: 15px;
}

.asset-preview-shot-card p {
  margin: 0 0 10px;
  color: #344054;
  font-size: 13px;
  line-height: 1.6;
}

.asset-preview-benchmark {
  display: grid;
  gap: 14px;
}

.asset-preview-video-info {
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 12px;
}

.asset-preview-video-info img,
.asset-preview-cover-placeholder {
  width: 168px;
  height: 94px;
  border-radius: 10px;
  object-fit: cover;
  background: #eef0ff;
}

.asset-preview-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6d5dfc;
  font-weight: 900;
}

.asset-preview-video-info strong {
  display: block;
  color: #111827;
  font-size: 16px;
}

.asset-preview-video-info p,
.asset-preview-video-info small {
  color: #667085;
  line-height: 1.6;
}

.asset-preview-text-panel {
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fbfcff;
  padding: 14px;
}

.asset-preview-text-panel h4 {
  margin: 0 0 10px;
  color: #111827;
  font-size: 15px;
}

.asset-preview-text-panel p {
  margin: 0;
  white-space: pre-wrap;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.75;
}

.asset-preview-empty {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dfe3ee;
  border-radius: 12px;
  background: #fbfcff;
  color: #667085;
  font-weight: 700;
}

@media (max-width: 980px) {
  .asset-center-head {
    grid-template-columns: 1fr;
  }

  .asset-header-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-header-actions .app-secondary-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .asset-header-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .asset-scope-segment,
  .asset-category-segment,
  .app-selected-project {
    width: 100%;
  }

  .asset-scope-btn {
    flex: 1 1 0;
  }

  .asset-row-actions {
    align-items: stretch;
    width: 100%;
  }

  .voice-library-item {
    align-items: stretch;
    flex-direction: column;
  }

  .asset-preview-toolbar,
  .asset-preview-video-info {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .asset-preview-toolbar select,
  .asset-preview-video-info img,
  .asset-preview-cover-placeholder {
    width: 100%;
  }
}

.asset-center-panel--embed .asset-center-head h2 {
  font-size: 17px;
}

.asset-center-panel--embed .asset-center-head p {
  font-size: 12px;
}
</style>

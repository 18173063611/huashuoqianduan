<template>
  <section class="system-page">
    <header class="system-head">
      <div>
        <span>系统管理</span>
        <h2>我的收藏</h2>
        <p>沉淀常用素材、模板、数字人和音色；收藏结果保存在当前浏览器，可作为后续创作的快捷入口。</p>
      </div>
      <button type="button" class="system-secondary-button" :disabled="loading" @click="loadAll">
        {{ loading ? '刷新中...' : '刷新数据' }}
      </button>
    </header>

    <div class="system-stat-grid">
      <button
        v-for="category in favoriteCategories"
        :key="category.kind"
        type="button"
        class="system-stat-card"
        :class="{ active: activeKind === category.kind }"
        @click="activeKind = category.kind"
      >
        <strong>{{ category.label }}</strong>
        <span>{{ favoriteCount(category.kind) }} 个收藏</span>
      </button>
    </div>

    <p v-if="errorMessage" class="system-error">{{ errorMessage }}</p>

    <div class="system-two-column">
      <section class="system-panel">
        <div class="system-panel-head">
          <div>
            <h3>已收藏{{ activeCategoryLabel }}</h3>
            <p>收藏后可从这里快速回到对应功能或素材位置。</p>
          </div>
          <button
            type="button"
            class="system-text-button"
            :disabled="activeFavorites.length === 0"
            @click="clearActiveFavorites"
          >
            清空本类
          </button>
        </div>

        <div v-if="activeFavorites.length === 0" class="system-empty">
          暂无收藏，可从右侧列表添加常用{{ activeCategoryLabel }}。
        </div>
        <div v-else class="system-list">
          <article v-for="item in activeFavorites" :key="`${item.kind}-${item.id}`" class="system-row-card">
            <div class="system-thumb">
              <img v-if="resolvedPreview(item.previewUrl)" :src="resolvedPreview(item.previewUrl)" alt="" />
              <span v-else>{{ activeCategoryShortLabel }}</span>
            </div>
            <div class="system-row-main">
              <strong>{{ item.title }}</strong>
              <p>{{ item.subtitle || '已加入收藏' }}</p>
              <small>收藏于 {{ formatTime(item.addedAt) }}</small>
            </div>
            <div class="system-row-actions">
              <RouterLink class="system-secondary-button" :to="item.route || fallbackRoute(item.kind)">打开</RouterLink>
              <button type="button" class="system-danger-button" @click="removeFavorite(item)">取消收藏</button>
            </div>
          </article>
        </div>
      </section>

      <section class="system-panel">
        <div class="system-panel-head">
          <div>
            <h3>可加入收藏</h3>
            <p>{{ candidateHint }}</p>
          </div>
        </div>

        <div v-if="loading && activeCandidates.length === 0" class="system-empty">正在加载候选项。</div>
        <div v-else-if="activeCandidates.length === 0" class="system-empty">
          暂无可收藏{{ activeCategoryLabel }}，可先去对应页面创建或上传。
        </div>
        <div v-else class="system-list">
          <article v-for="item in activeCandidates" :key="`${item.kind}-${item.id}`" class="system-row-card">
            <div class="system-thumb">
              <img v-if="resolvedPreview(item.previewUrl)" :src="resolvedPreview(item.previewUrl)" alt="" />
              <span v-else>{{ activeCategoryShortLabel }}</span>
            </div>
            <div class="system-row-main">
              <strong>{{ item.title }}</strong>
              <p>{{ item.subtitle || candidateDefaultSubtitle }}</p>
            </div>
            <button
              type="button"
              class="system-primary-button"
              :class="{ muted: isFavorite(item) }"
              @click="toggleFavorite(item)"
            >
              {{ isFavorite(item) ? '已收藏' : '加入收藏' }}
            </button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAssets } from '../../services/assetApi'
import { getAvatars } from '../../services/avatarApi'
import { getTemplates } from '../../services/templateApi'
import { getVoicePresets } from '../../services/voiceApi'
import { API_ORIGIN } from '../../services/request'
import type { AssetItem } from '../../types/assetTypes'
import type { AvatarItem } from '../../types/avatarTypes'
import type { TemplateItem } from '../../types/templateTypes'
import type { VoicePresetItem } from '../../types/voiceTypes'
import {
  clearSystemFavorites,
  isSystemFavorite,
  loadSystemFavorites,
  toggleSystemFavorite,
  type SystemFavoriteItem,
  type SystemFavoriteKind,
} from '../../services/systemWorkspaceStore'

defineOptions({ inheritAttrs: false })

type FavoriteCandidate = Omit<SystemFavoriteItem, 'addedAt'>

const favoriteCategories: Array<{ kind: SystemFavoriteKind; label: string; shortLabel: string }> = [
  { kind: 'asset', label: '收藏素材', shortLabel: '素材' },
  { kind: 'template', label: '收藏模板', shortLabel: '模板' },
  { kind: 'avatar', label: '收藏数字人', shortLabel: '数字人' },
  { kind: 'voice', label: '收藏音色', shortLabel: '音色' },
]

const activeKind = ref<SystemFavoriteKind>('asset')
const favorites = ref<SystemFavoriteItem[]>(loadSystemFavorites())
const assets = ref<AssetItem[]>([])
const templates = ref<TemplateItem[]>([])
const avatars = ref<AvatarItem[]>([])
const voices = ref<VoicePresetItem[]>([])
const loading = ref(false)
const errorMessage = ref('')

const activeCategory = computed(() => favoriteCategories.find((item) => item.kind === activeKind.value) || favoriteCategories[0])
const activeCategoryLabel = computed(() => activeCategory.value.label.replace(/^收藏/, ''))
const activeCategoryShortLabel = computed(() => activeCategory.value.shortLabel)
const activeFavorites = computed(() => favorites.value.filter((item) => item.kind === activeKind.value))
const activeCandidates = computed<FavoriteCandidate[]>(() => {
  if (activeKind.value === 'asset') return assets.value.map(assetToFavorite)
  if (activeKind.value === 'template') return templates.value.map(templateToFavorite)
  if (activeKind.value === 'avatar') return avatars.value.map(avatarToFavorite)
  return voices.value.map(voiceToFavorite)
})
const candidateHint = computed(() => {
  if (activeKind.value === 'asset') return '展示最近素材资产，可把高频图片、视频、音频、文案和分镜加入收藏。'
  if (activeKind.value === 'template') return '展示模板库候选，收藏后可作为自动匹配排序的人工偏好。'
  if (activeKind.value === 'avatar') return '展示数字人形象，便于后续汽车销售视频快速选用。'
  return '展示可用音色，便于后续口播和 TTS 快速选用。'
})
const candidateDefaultSubtitle = computed(() => `可加入${activeCategoryLabel.value}收藏`)

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [assetList, templateList, avatarList, voiceList] = await Promise.allSettled([
      getAssets({ scope: 'all', sort: 'createdAtDesc', pageSize: 24 }),
      getTemplates({ scope: 'all', sort: 'publishedAtDesc' }),
      getAvatars(),
      getVoicePresets(),
    ])
    assets.value = assetList.status === 'fulfilled' ? assetList.value : []
    templates.value = templateList.status === 'fulfilled' ? templateList.value.slice(0, 24) : []
    avatars.value = avatarList.status === 'fulfilled' ? avatarList.value.slice(0, 24) : []
    voices.value = voiceList.status === 'fulfilled' ? voiceList.value.records.slice(0, 24) : []
    const rejected = [assetList, templateList, avatarList, voiceList].find((item) => item.status === 'rejected')
    if (rejected && rejected.status === 'rejected') {
      errorMessage.value = rejected.reason instanceof Error ? rejected.reason.message : '部分收藏候选加载失败'
    }
  } finally {
    favorites.value = loadSystemFavorites()
    loading.value = false
  }
}

function favoriteCount(kind: SystemFavoriteKind) {
  return favorites.value.filter((item) => item.kind === kind).length
}

function toggleFavorite(item: FavoriteCandidate) {
  toggleSystemFavorite(item)
  favorites.value = loadSystemFavorites()
}

function removeFavorite(item: SystemFavoriteItem) {
  toggleSystemFavorite(item)
  favorites.value = loadSystemFavorites()
}

function clearActiveFavorites() {
  clearSystemFavorites(activeKind.value)
  favorites.value = loadSystemFavorites()
}

function isFavorite(item: FavoriteCandidate) {
  return isSystemFavorite(item.kind, item.id)
}

function fallbackRoute(kind: SystemFavoriteKind) {
  if (kind === 'asset') return '/assets?tab=materials'
  if (kind === 'template') return '/asset-reuse'
  if (kind === 'avatar') return '/avatar'
  return '/voice'
}

function resolvedPreview(url?: string | null) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function assetToFavorite(asset: AssetItem): FavoriteCandidate {
  return {
    kind: 'asset',
    id: String(asset.assetId),
    title: asset.fileName || `素材 ${asset.assetId}`,
    subtitle: `${asset.assetType}${asset.assetGroup ? ` · ${asset.assetGroup}` : ''}`,
    previewUrl: asset.thumbnailUrl || asset.fileUrl,
    route: '/assets?tab=materials',
    meta: { assetType: asset.assetType, sourceType: asset.sourceType },
  }
}

function templateToFavorite(template: TemplateItem): FavoriteCandidate {
  return {
    kind: 'template',
    id: String(template.templateId),
    title: template.title || `模板 ${template.templateId}`,
    subtitle: template.tags || template.description || '创作模板',
    previewUrl: null,
    route: '/asset-reuse',
    meta: { visibility: template.visibility, status: template.status },
  }
}

function avatarToFavorite(avatar: AvatarItem): FavoriteCandidate {
  return {
    kind: 'avatar',
    id: String(avatar.avatarId),
    title: avatar.avatarName || `数字人 ${avatar.avatarId}`,
    subtitle: avatar.defaultAvatar ? '默认数字人形象' : avatar.sourceType || '数字人形象',
    previewUrl: avatar.previewUrl,
    route: '/avatar',
    meta: { assetId: avatar.assetId, visibility: avatar.visibility },
  }
}

function voiceToFavorite(voice: VoicePresetItem): FavoriteCandidate {
  return {
    kind: 'voice',
    id: String(voice.voiceId),
    title: voice.voiceName || `音色 ${voice.voiceId}`,
    subtitle: [voice.gender, voice.scene].filter(Boolean).join(' · ') || voice.provider,
    previewUrl: null,
    route: '/voice',
    meta: { provider: voice.provider, providerVoiceId: voice.providerVoiceId },
  }
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.system-page {
  display: grid;
  gap: 16px;
}

.system-head,
.system-panel,
.system-stat-card,
.system-row-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.system-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.system-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.system-head h2 {
  margin: 6px 0;
  color: #172033;
  font-size: 20px;
  font-weight: 900;
}

.system-head p,
.system-panel-head p,
.system-row-main p,
.system-row-main small {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.system-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.system-stat-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.system-stat-card.active {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.system-stat-card strong,
.system-panel-head h3,
.system-row-main strong {
  color: #172033;
  font-weight: 900;
}

.system-stat-card span {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.system-two-column {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.system-panel {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 16px;
}

.system-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.system-panel-head h3 {
  margin: 0 0 6px;
  font-size: 16px;
}

.system-list {
  display: grid;
  gap: 10px;
}

.system-row-card {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
}

.system-thumb {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.system-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.system-row-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.system-row-main strong,
.system-row-main p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.system-primary-button,
.system-secondary-button,
.system-danger-button,
.system-text-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border-radius: 7px;
  padding: 0 12px;
  font-size: 12.5px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.system-primary-button {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.system-primary-button.muted,
.system-secondary-button {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.system-danger-button {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #dc2626;
}

.system-text-button {
  border: 0;
  background: transparent;
  color: #2563eb;
}

.system-empty,
.system-error {
  border: 1px dashed #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
  color: #667085;
  padding: 18px;
  font-size: 13px;
  line-height: 1.6;
}

.system-error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

@media (max-width: 1100px) {
  .system-stat-grid,
  .system-two-column {
    grid-template-columns: 1fr 1fr;
  }

  .system-two-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .system-head,
  .system-panel-head,
  .system-row-card {
    grid-template-columns: 1fr;
  }

  .system-head,
  .system-panel-head {
    display: grid;
  }

  .system-stat-grid {
    grid-template-columns: 1fr;
  }

  .system-row-actions {
    justify-content: flex-start;
  }
}
</style>

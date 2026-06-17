<template>
  <Teleport to="body">
    <div v-if="modelValue" class="avatar-select-backdrop" @click.self="close">
      <aside class="avatar-select-drawer" aria-label="选择数字人形象">
        <header class="avatar-select-head">
          <div>
            <h2>选择数字人</h2>
            <p>选择后会自动作为“数字人图片”素材参与本次汽车销售成片。</p>
          </div>
          <button type="button" class="avatar-select-close" aria-label="关闭数字人选择" @click="close">×</button>
        </header>

        <div class="avatar-select-toolbar">
          <div class="avatar-select-tabs" role="tablist" aria-label="数字人范围">
            <button
              v-for="option in scopeOptions"
              :key="option.value"
              type="button"
              role="tab"
              :class="{ active: selectedScope === option.value }"
              :aria-selected="selectedScope === option.value"
              @click="selectedScope = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <button type="button" class="avatar-select-button" :disabled="loading" @click="loadAvatars">
            {{ loading ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
        <div v-else-if="loading" class="avatar-select-empty">正在加载数字人形象。</div>
        <div v-else-if="filteredAvatars.length === 0" class="avatar-select-empty">
          当前范围暂无数字人形象。
        </div>
        <div v-else class="avatar-select-grid">
          <article
            v-for="avatar in filteredAvatars"
            :key="avatar.avatarId"
            class="avatar-select-card"
            :class="{ active: avatar.avatarId === selectedAvatarId }"
          >
            <div class="avatar-select-cover">
              <img v-if="avatar.previewUrl" :src="resolveUrl(avatar.previewUrl)" :alt="avatar.avatarName" />
              <span v-else>数字人</span>
            </div>
            <div class="avatar-select-info">
              <strong>{{ avatar.avatarName }}</strong>
              <p>{{ sourceLabel(avatar) }} · {{ visibilityLabel(avatar) }}</p>
              <small v-if="avatar.defaultAvatar">默认形象</small>
              <small v-else-if="!avatar.assetId" class="avatar-select-warning">缺少素材 ID，仅可预览</small>
            </div>
            <button
              type="button"
              class="avatar-select-primary"
              :disabled="!avatar.assetId"
              @click="selectAvatar(avatar)"
            >
              {{ avatar.avatarId === selectedAvatarId ? '已选择' : '选择' }}
            </button>
          </article>
        </div>

        <footer class="avatar-select-foot">
          <span>没有合适形象时，可先创建数字人再回到本页面选择。</span>
          <button type="button" class="app-secondary-button" @click="$emit('create')">创建数字人</button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAvatars } from '../../services/avatarApi'
import { API_ORIGIN } from '../../services/request'
import type { AvatarItem } from '../../types/avatarTypes'

type AvatarScope = 'all' | 'private' | 'public'

const props = defineProps<{
  modelValue: boolean
  selectedAvatarId?: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [avatar: AvatarItem]
  create: []
}>()

const avatars = ref<AvatarItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const selectedScope = ref<AvatarScope>('all')

const scopeOptions: Array<{ value: AvatarScope; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'private', label: '我的数字人' },
  { value: 'public', label: '公共推荐' },
]

const filteredAvatars = computed(() => {
  const list = [...avatars.value].sort((a, b) => {
    if (a.defaultAvatar !== b.defaultAvatar) {
      return a.defaultAvatar ? -1 : 1
    }
    return Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || '')
  })
  if (selectedScope.value === 'private') {
    return list.filter((avatar) => visibilityLabel(avatar) === '私有')
  }
  if (selectedScope.value === 'public') {
    return list.filter((avatar) => visibilityLabel(avatar) === '公共')
  }
  return list
})

watch(
  () => props.modelValue,
  (open) => {
    if (open && avatars.value.length === 0) {
      void loadAvatars()
    }
  },
)

async function loadAvatars() {
  loading.value = true
  errorMessage.value = ''
  try {
    avatars.value = await getAvatars()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载数字人失败'
  } finally {
    loading.value = false
  }
}

function selectAvatar(avatar: AvatarItem) {
  if (!avatar.assetId) {
    return
  }
  emit('select', avatar)
  close()
}

function close() {
  emit('update:modelValue', false)
}

function sourceLabel(avatar: AvatarItem) {
  if (avatar.sourceType === 'AVATAR_GENERATE') return '数字人形象生成'
  if (avatar.sourceType === 'AI_GENERATED') return 'AI 生成'
  if (avatar.sourceType === 'USER_UPLOAD') return '用户上传'
  return avatar.sourceType || '形象资产'
}

function visibilityLabel(avatar: AvatarItem) {
  if (avatar.visibility === 'PUBLIC') return '公共'
  if (avatar.visibility === 'PRIVATE') return '私有'
  return avatar.ownerUserId == null ? '公共' : '私有'
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
</script>

<style scoped>
.avatar-select-backdrop {
  position: fixed;
  z-index: 2100;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.34);
}

.avatar-select-drawer {
  display: flex;
  width: min(620px, 100vw);
  height: 100vh;
  flex-direction: column;
  background: #fff;
  box-shadow: -12px 0 32px rgba(15, 23, 42, 0.18);
}

.avatar-select-head,
.avatar-select-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--hs-border);
  padding: 18px 20px;
}

.avatar-select-foot {
  border-top: 1px solid var(--hs-border);
  border-bottom: 0;
}

.avatar-select-head h2 {
  margin: 0;
  color: var(--hs-text);
  font-size: 18px;
  font-weight: 850;
}

.avatar-select-head p,
.avatar-select-foot span {
  margin: 4px 0 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.avatar-select-close {
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

.avatar-select-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px 0;
}

.avatar-select-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.avatar-select-tabs button,
.avatar-select-button,
.avatar-select-primary {
  min-height: 34px;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text);
  padding: 0 12px;
  font-weight: 800;
}

.avatar-select-tabs button.active,
.avatar-select-primary {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.avatar-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  overflow-y: auto;
  padding: 16px 20px;
}

.avatar-select-card {
  display: grid;
  gap: 10px;
  align-content: start;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: var(--hs-surface-muted);
  padding: 10px;
}

.avatar-select-card.active {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
}

.avatar-select-cover {
  display: grid;
  aspect-ratio: 3 / 4;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #eef2ff;
  color: var(--hs-primary);
  font-size: 13px;
  font-weight: 850;
}

.avatar-select-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-select-info {
  display: grid;
  gap: 4px;
}

.avatar-select-info strong {
  overflow: hidden;
  color: var(--hs-text);
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-select-info p,
.avatar-select-info small,
.avatar-select-empty {
  margin: 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.avatar-select-warning {
  color: var(--hs-warning);
}

.avatar-select-empty {
  padding: 28px 20px;
  text-align: center;
}

@media (max-width: 560px) {
  .avatar-select-head,
  .avatar-select-foot,
  .avatar-select-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

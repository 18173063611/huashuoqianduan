<template>
  <main class="system-page app-page-stack">
    <section class="system-head">
      <div>
        <span class="system-eyebrow">系统管理</span>
        <h1>偏好设置</h1>
        <p>保存汽车销售一键成片的默认参数，让常用比例、时长、字幕、音频和推荐卖点自动带入创作页。</p>
      </div>
      <div class="system-head-actions">
        <button class="app-secondary-button" type="button" @click="resetPreferences">恢复默认</button>
        <button class="app-primary-button" type="button" @click="savePreferences">保存偏好</button>
      </div>
    </section>

    <p v-if="savedMessage" class="system-success">{{ savedMessage }}</p>
    <p v-if="loadError" class="system-error">{{ loadError }}</p>

    <section class="system-layout">
      <div class="system-form-stack">
        <section class="system-panel">
          <header class="system-panel-head">
            <div>
              <h2>生成默认值</h2>
              <p>这些值会作为一键成片页面的初始参数，不影响单次任务里的临时修改。</p>
            </div>
          </header>
          <div class="system-field-grid">
            <label class="system-field">
              <span>画面比例</span>
              <select v-model="preferences.aspectRatio">
                <option value="9:16">9:16 竖屏短视频</option>
                <option value="16:9">16:9 横屏展示</option>
                <option value="auto">自动判断</option>
              </select>
            </label>
            <label class="system-field">
              <span>目标时长</span>
              <select v-model.number="preferences.duration">
                <option :value="10">10 秒</option>
                <option :value="15">15 秒</option>
                <option :value="20">20 秒</option>
                <option :value="30">30 秒</option>
              </select>
            </label>
            <label class="system-field">
              <span>语音语言</span>
              <select v-model="preferences.voiceLanguage">
                <option value="zh-CN">中文</option>
                <option value="en-US">英文</option>
              </select>
            </label>
            <label class="system-field">
              <span>生成模型</span>
              <select v-model="preferences.model">
                <option value="auto">自动</option>
                <option value="doubao-seedance-1-5-pro-251215">Seedance 1.5 Pro</option>
                <option value="doubao-seedance-2-0-pro-250528">Seedance 2.0 Pro</option>
              </select>
            </label>
          </div>
        </section>

        <section class="system-panel">
          <header class="system-panel-head">
            <div>
              <h2>字幕与音频</h2>
              <p>控制字幕策略、背景音和口播风格的默认选择。</p>
            </div>
          </header>
          <div class="system-field-grid">
            <label class="system-field">
              <span>字幕策略</span>
              <select v-model="preferences.subtitleMode">
                <option value="auto">自动字幕</option>
                <option value="off">关闭字幕</option>
                <option value="upload">自定义字幕</option>
              </select>
            </label>
            <label class="system-field">
              <span>音频策略</span>
              <select v-model="preferences.audioPolicy">
                <option value="auto">智能匹配</option>
                <option value="none">关闭音频</option>
                <option value="bgm">仅背景音乐</option>
                <option value="voiceover">优先口播</option>
              </select>
            </label>
            <label class="system-field">
              <span>口播风格</span>
              <select v-model="preferences.nativeVoiceStyle">
                <option value="natural_sales">自然销售</option>
                <option value="warm_female">温暖女声</option>
                <option value="steady_male">稳重男声</option>
                <option value="energetic">热情促销</option>
              </select>
            </label>
            <label class="system-field">
              <span>讲述节奏</span>
              <select v-model="preferences.nativeSpeechStyle">
                <option value="balanced">均衡</option>
                <option value="fast">偏快</option>
                <option value="calm">舒缓</option>
              </select>
            </label>
          </div>
          <label class="system-check">
            <input
              v-model="preferences.burnInSubtitle"
              type="checkbox"
              :disabled="preferences.subtitleMode === 'off'"
            />
            <span>默认烧录字幕到成片画面</span>
          </label>
        </section>

        <section class="system-panel">
          <header class="system-panel-head">
            <div>
              <h2>视频风格与推荐卖点</h2>
              <p>影响 AI 方案预览里的卖点匹配排序和生成风格。</p>
            </div>
          </header>
          <div class="system-field-grid">
            <label class="system-field">
              <span>视频风格</span>
              <select v-model="preferences.videoStyle">
                <option value="realistic">真实销售</option>
                <option value="premium">高级质感</option>
                <option value="energetic">高能短视频</option>
                <option value="family">家庭温暖</option>
                <option value="tech">科技智能</option>
              </select>
            </label>
          </div>
          <div class="system-chip-grid">
            <label
              v-for="item in sellingPointOptions"
              :key="item.id"
              class="system-chip"
              :class="{ active: preferences.preferredSellingPointIds.includes(item.id) }"
            >
              <input v-model="preferences.preferredSellingPointIds" type="checkbox" :value="item.id" />
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </label>
          </div>
        </section>

        <section class="system-panel">
          <header class="system-panel-head">
            <div>
              <h2>数字人与声音偏好</h2>
              <p>选择常用销售顾问形象和口播音色，后续可继续用于一键成片高级参数。</p>
            </div>
            <button class="app-secondary-button" type="button" :disabled="assetLoading" @click="loadAssets">
              {{ assetLoading ? '加载中...' : '刷新列表' }}
            </button>
          </header>
          <div class="system-field-grid">
            <label class="system-field">
              <span>默认数字人</span>
              <select v-model="preferences.preferredAvatarId">
                <option :value="null">不指定</option>
                <option v-for="avatar in avatars" :key="avatar.avatarId" :value="avatar.avatarId">
                  {{ avatar.avatarName }}
                </option>
              </select>
            </label>
            <label class="system-field">
              <span>默认音色</span>
              <select v-model="preferences.preferredVoiceId">
                <option :value="null">不指定</option>
                <option v-for="voice in voices" :key="voice.voiceId" :value="voice.voiceId">
                  {{ voice.voiceName }}
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside class="system-summary">
        <h2>当前默认方案</h2>
        <dl>
          <div>
            <dt>比例 / 时长</dt>
            <dd>{{ preferences.aspectRatio }} · {{ preferences.duration }} 秒</dd>
          </div>
          <div>
            <dt>字幕 / 音频</dt>
            <dd>{{ subtitleModeLabel }} · {{ audioPolicyLabel }}</dd>
          </div>
          <div>
            <dt>风格</dt>
            <dd>{{ videoStyleLabel }}</dd>
          </div>
          <div>
            <dt>推荐卖点</dt>
            <dd>{{ selectedSellingPointLabel }}</dd>
          </div>
          <div>
            <dt>数字人</dt>
            <dd>{{ selectedAvatarName }}</dd>
          </div>
          <div>
            <dt>音色</dt>
            <dd>{{ selectedVoiceName }}</dd>
          </div>
        </dl>
        <RouterLink class="app-primary-button" to="/render">去一键成片</RouterLink>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getAvatars } from '../../services/avatarApi'
import { getVoicePresets } from '../../services/voiceApi'
import {
  loadCarSalesPreferences,
  resetCarSalesPreferences,
  saveCarSalesPreferences,
  type CarSalesGenerationPreferences,
} from '../../services/systemWorkspaceStore'
import type { AvatarItem } from '../../types/avatarTypes'
import type { VoicePresetItem } from '../../types/voiceTypes'

defineOptions({ inheritAttrs: false })

interface SellingPointOption {
  id: string
  title: string
  description: string
}

const sellingPointOptions: SellingPointOption[] = [
  { id: 'family-space', title: '家用空间', description: '大空间、后排、后备箱' },
  { id: 'smart-cabin', title: '智能座舱', description: '大屏、语音、辅助驾驶' },
  { id: 'exterior-value', title: '外观颜值', description: '设计、线条、灯组' },
  { id: 'performance', title: '动力性能', description: '加速、操控、驾驶感' },
  { id: 'range-saving', title: '续航省油', description: '低能耗、长续航、通勤' },
  { id: 'store-promo', title: '到店促销', description: '试驾、权益、限时活动' },
  { id: 'price-offer', title: '价格优惠', description: '预算、金融、礼包' },
]

const preferences = ref<CarSalesGenerationPreferences>(loadCarSalesPreferences())
const avatars = ref<AvatarItem[]>([])
const voices = ref<VoicePresetItem[]>([])
const assetLoading = ref(false)
const loadError = ref('')
const savedMessage = ref('')

const subtitleModeLabel = computed(() => {
  const map: Record<string, string> = {
    auto: '自动字幕',
    off: '关闭字幕',
    upload: '自定义字幕',
  }
  return map[preferences.value.subtitleMode] || preferences.value.subtitleMode
})

const audioPolicyLabel = computed(() => {
  const map: Record<string, string> = {
    auto: '智能匹配',
    none: '关闭音频',
    bgm: '仅背景音乐',
    voiceover: '优先口播',
    EXTERNAL_AUDIO: '外部音频',
    VIDEO_NATIVE_AUDIO: '音视频同步',
    external_audio: '外部音频',
    video_native_audio: '音视频同步',
  }
  return map[preferences.value.audioPolicy] || preferences.value.audioPolicy
})

const videoStyleLabel = computed(() => {
  const map: Record<string, string> = {
    realistic: '真实销售',
    premium: '高级质感',
    energetic: '高能短视频',
    family: '家庭温暖',
    tech: '科技智能',
  }
  return map[preferences.value.videoStyle] || preferences.value.videoStyle
})

const selectedSellingPointLabel = computed(() => {
  const selected = sellingPointOptions
    .filter((item) => preferences.value.preferredSellingPointIds.includes(item.id))
    .map((item) => item.title)
  return selected.length ? selected.join('、') : '不预设'
})

const selectedAvatarName = computed(() => {
  const selected = avatars.value.find((item) => item.avatarId === Number(preferences.value.preferredAvatarId))
  return selected?.avatarName || '不指定'
})

const selectedVoiceName = computed(() => {
  const selected = voices.value.find((item) => item.voiceId === Number(preferences.value.preferredVoiceId))
  return selected?.voiceName || '不指定'
})

onMounted(() => {
  loadAssets()
})

async function loadAssets() {
  assetLoading.value = true
  loadError.value = ''
  const [avatarResult, voiceResult] = await Promise.allSettled([
    getAvatars(),
    getVoicePresets(),
  ])

  if (avatarResult.status === 'fulfilled') {
    avatars.value = avatarResult.value
  } else {
    loadError.value = '数字人列表加载失败，可先保存其他偏好。'
  }

  if (voiceResult.status === 'fulfilled') {
    voices.value = voiceResult.value.records
  } else {
    loadError.value = loadError.value || '声音列表加载失败，可先保存其他偏好。'
  }

  assetLoading.value = false
}

function savePreferences() {
  const next: CarSalesGenerationPreferences = {
    ...preferences.value,
    preferredSellingPointIds: [...preferences.value.preferredSellingPointIds],
    preferredAvatarId: normalizeId(preferences.value.preferredAvatarId),
    preferredVoiceId: normalizeId(preferences.value.preferredVoiceId),
  }
  saveCarSalesPreferences(next)
  preferences.value = loadCarSalesPreferences()
  savedMessage.value = '偏好已保存，下一次进入一键成片会自动带入。'
  window.setTimeout(() => {
    savedMessage.value = ''
  }, 2500)
}

function resetPreferences() {
  preferences.value = resetCarSalesPreferences()
  savedMessage.value = '已恢复系统默认偏好。'
}

function normalizeId(value: number | null) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null
}
</script>

<style scoped>
.system-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.system-head,
.system-panel,
.system-summary {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.system-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
}

.system-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #2563eb;
  font-weight: 700;
}

.system-head h1,
.system-panel h2,
.system-summary h2 {
  margin: 0;
  color: #0f172a;
}

.system-head p,
.system-panel p {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.system-head-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
}

.system-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.system-form-stack {
  display: grid;
  gap: 18px;
}

.system-panel {
  padding: 20px;
}

.system-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.system-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.system-field,
.system-check {
  display: grid;
  gap: 8px;
}

.system-field span,
.system-check span {
  color: #334155;
  font-weight: 700;
}

.system-field select {
  width: 100%;
  min-height: 42px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #0f172a;
}

.system-check {
  grid-template-columns: auto 1fr;
  align-items: center;
  margin-top: 16px;
}

.system-chip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.system-chip {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: start;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #f8fafc;
  cursor: pointer;
}

.system-chip.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.system-chip input {
  margin-top: 3px;
}

.system-chip strong {
  color: #0f172a;
}

.system-chip span {
  grid-column: 2;
  color: #64748b;
  font-size: 13px;
}

.system-summary {
  position: sticky;
  top: 88px;
  padding: 20px;
}

.system-summary dl {
  display: grid;
  gap: 14px;
  margin: 18px 0;
}

.system-summary div {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.system-summary dt {
  color: #64748b;
  font-size: 13px;
}

.system-summary dd {
  margin: 6px 0 0;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.5;
}

.system-success,
.system-error {
  border-radius: 8px;
  padding: 12px 14px;
}

.system-success {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #047857;
}

.system-error {
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

@media (max-width: 980px) {
  .system-page {
    padding: 16px;
  }

  .system-head,
  .system-panel-head,
  .system-layout,
  .system-field-grid,
  .system-chip-grid {
    display: grid;
    grid-template-columns: 1fr;
  }

  .system-head-actions {
    width: 100%;
  }

  .system-head-actions button {
    flex: 1;
  }

  .system-summary {
    position: static;
  }
}
</style>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="car-advanced-backdrop" @click.self="$emit('update:modelValue', false)">
      <aside class="car-advanced-drawer" aria-label="高级参数">
        <header class="car-advanced-head">
          <div>
            <h2>高级参数</h2>
            <p>数字人、字幕、大字报、BGM 和生成模型会随本次任务提交。</p>
          </div>
          <button type="button" class="car-advanced-close" aria-label="关闭高级参数" @click="$emit('update:modelValue', false)">×</button>
        </header>

        <div class="car-advanced-body">
          <section class="car-advanced-section">
            <h3>数字人出镜</h3>
            <label class="car-field">
              <span>视频类型</span>
              <select :value="settings.videoType" @change="patchVideoType(($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['videoType'])">
                <option value="standard">常规销售视频</option>
                <option value="digital_human">数字人口播</option>
                <option value="product_showcase">车型展示</option>
                <option value="silent_bgm">无口播 BGM</option>
              </select>
            </label>
            <div class="car-segmented">
              <button type="button" :class="{ active: !settings.hostAppearanceEnabled }" @click="patch({ hostAppearanceEnabled: false, videoType: settings.videoType === 'digital_human' ? 'standard' : settings.videoType })">
                不使用
              </button>
              <button type="button" :class="{ active: settings.hostAppearanceEnabled }" @click="patch({ hostAppearanceEnabled: true, videoType: 'digital_human' })">
                使用数字人
              </button>
            </div>
            <div v-if="settings.hostAppearanceEnabled" class="car-avatar-picker">
              <div v-if="selectedAvatarPreviewUrl" class="car-avatar-preview">
                <img :src="selectedAvatarPreviewUrl" :alt="selectedAvatarName || '数字人形象'" />
              </div>
              <div class="car-avatar-meta">
                <strong>{{ selectedAvatarName || hostMaterialLabel }}</strong>
                <small>{{ selectedAvatarHint }}</small>
              </div>
              <div class="car-avatar-actions">
                <button type="button" @click="$emit('select-avatar')">选择数字人</button>
                <button type="button" @click="$emit('select-host-asset')">资产选择</button>
                <button v-if="selectedAvatarName || hasHostMaterial" type="button" @click="$emit('clear-avatar')">清除</button>
              </div>
            </div>
            <p class="car-advanced-note">启用后会使用已选“数字人图片/口播视频”素材；没有相关素材时会提示补充。</p>
          </section>

          <section class="car-advanced-section">
            <h3>场景图</h3>
            <div class="car-scene-picker">
              <div v-if="selectedScenePreviewUrl" class="car-scene-preview">
                <img :src="selectedScenePreviewUrl" :alt="selectedSceneName || '场景图'" />
              </div>
              <div v-else class="car-scene-empty">未选择</div>
              <div class="car-avatar-meta">
                <strong>{{ selectedSceneName || '未选择场景图' }}</strong>
                <small>{{ selectedSceneHint }}</small>
              </div>
              <div class="car-avatar-actions">
                <button type="button" @click="$emit('select-scene-asset')">选择场景图</button>
                <button v-if="hasSceneMaterial" type="button" @click="$emit('clear-scene')">清除</button>
              </div>
            </div>
            <p class="car-advanced-note">场景图会作为展厅、户外、道路或夜景门店背景传入视频生成，参与分镜背景匹配。</p>
          </section>

          <section class="car-advanced-section">
            <h3>字幕</h3>
            <label class="car-field">
              <span>字幕策略</span>
              <select :value="settings.subtitleMode" @change="patch({ subtitleMode: ($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['subtitleMode'] })">
                <option value="auto">自动字幕</option>
                <option value="off">关闭字幕</option>
                <option value="upload">自定义字幕</option>
              </select>
            </label>
            <textarea
              v-if="settings.subtitleMode === 'upload'"
              :value="settings.customSubtitle"
              rows="4"
              maxlength="1000"
              placeholder="输入要烧录到视频里的字幕文案"
              @input="patch({ customSubtitle: ($event.target as HTMLTextAreaElement).value })"
            />
            <label class="car-check">
              <input
                type="checkbox"
                :checked="settings.burnInSubtitle"
                :disabled="settings.subtitleMode === 'off'"
                @change="patch({ burnInSubtitle: ($event.target as HTMLInputElement).checked })"
              />
              <span>后期烧录字幕</span>
            </label>
            <div class="car-grid-two">
              <label class="car-field">
                <span>字幕位置</span>
                <select :value="settings.subtitleOverlay.position" @change="patchOverlay('subtitleOverlay', { position: ($event.target as HTMLSelectElement).value as OverlayPosition })">
                  <option value="bottom">底部</option>
                  <option value="middle">中部</option>
                  <option value="top">顶部</option>
                </select>
              </label>
              <label class="car-field">
                <span>字号</span>
                <input
                  type="number"
                  min="18"
                  max="72"
                  step="2"
                  :value="settings.subtitleOverlay.fontSize"
                  @input="patchOverlay('subtitleOverlay', { fontSize: numberFromEvent($event, 36) })"
                />
              </label>
            </div>
          </section>

          <section class="car-advanced-section">
            <h3>大字报</h3>
            <label class="car-check">
              <input
                type="checkbox"
                :checked="settings.headlineOverlay.enabled"
                @change="patchOverlay('headlineOverlay', { enabled: ($event.target as HTMLInputElement).checked })"
              />
              <span>使用大字报</span>
            </label>
            <textarea
              :value="settings.headlineOverlay.text"
              rows="3"
              maxlength="80"
              placeholder="例如：限时到店礼遇，预约试驾享专属权益"
              @input="patchOverlay('headlineOverlay', { text: ($event.target as HTMLTextAreaElement).value })"
            />
            <div class="car-grid-two">
              <label class="car-field">
                <span>位置</span>
                <select :value="settings.headlineOverlay.position" @change="patchOverlay('headlineOverlay', { position: ($event.target as HTMLSelectElement).value as OverlayPosition })">
                  <option value="top">顶部</option>
                  <option value="middle">中部</option>
                  <option value="bottom">底部</option>
                </select>
              </label>
              <label class="car-field">
                <span>字号</span>
                <input
                  type="number"
                  min="36"
                  max="120"
                  step="4"
                  :value="settings.headlineOverlay.fontSize"
                  @input="patchOverlay('headlineOverlay', { fontSize: numberFromEvent($event, 64) })"
                />
              </label>
            </div>
          </section>

          <section class="car-advanced-section">
            <h3>音频与风格</h3>
            <label class="car-field">
              <span>背景音乐</span>
              <select :value="settings.audioPolicy" @change="patch({ audioPolicy: ($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['audioPolicy'] })">
                <option value="auto">智能匹配/使用已选音频</option>
                <option value="none">关闭音频</option>
                <option value="bgm">仅背景音乐</option>
                <option value="voiceover">优先口播音频</option>
              </select>
            </label>
            <div class="car-grid-two">
              <label class="car-field">
                <span>视频风格</span>
                <select :value="settings.videoStyle" @change="patch({ videoStyle: ($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['videoStyle'] })">
                  <option value="realistic">真实销售</option>
                  <option value="premium">高级质感</option>
                  <option value="energetic">高能短视频</option>
                  <option value="family">家庭温暖</option>
                  <option value="tech">科技智能</option>
                </select>
              </label>
              <label class="car-field">
                <span>口播风格</span>
                <select :value="settings.nativeVoiceStyle" @change="patch({ nativeVoiceStyle: ($event.target as HTMLSelectElement).value })">
                  <optgroup label="女声">
                    <option v-for="item in femaleVoiceStyleOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </optgroup>
                  <optgroup label="男声">
                    <option v-for="item in maleVoiceStyleOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </optgroup>
                </select>
                <small>{{ selectedVoiceStyleHint }}</small>
              </label>
            </div>
            <div class="car-grid-two">
              <label class="car-field">
                <span>语气口吻</span>
                <select :value="settings.tone" @change="patch({ tone: ($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['tone'] })">
                  <option value="professional">专业讲解</option>
                  <option value="promotional">促销转化</option>
                  <option value="premium">高级克制</option>
                  <option value="energetic">高能种草</option>
                  <option value="warm">温暖陪伴</option>
                  <option value="tech">科技理性</option>
                </select>
              </label>
              <label class="car-field">
                <span>BGM 风格</span>
                <select :value="settings.bgmStyle" @change="patch({ bgmStyle: ($event.target as HTMLSelectElement).value as CarSalesAdvancedSettings['bgmStyle'] })">
                  <option value="auto">智能匹配</option>
                  <option value="none">不使用 BGM</option>
                  <option value="upbeat">轻快节奏</option>
                  <option value="premium">高级氛围</option>
                  <option value="warm">温暖生活</option>
                  <option value="tech">科技动感</option>
                </select>
              </label>
            </div>
            <div class="car-grid-two">
              <label class="car-field">
                <span>讲述节奏</span>
                <select :value="settings.nativeSpeechStyle" @change="patch({ nativeSpeechStyle: ($event.target as HTMLSelectElement).value })">
                  <option v-for="item in speechStyleOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
                <small>{{ selectedSpeechStyleHint }}</small>
              </label>
              <label class="car-field">
                <span>生成模型</span>
                <select :value="settings.model" @change="patch({ model: ($event.target as HTMLSelectElement).value })">
                  <option value="doubao-seedance-2-0-pro-250528">Seedance 2.0 Pro</option>
                  <option value="doubao-seedance-1-5-pro-251215">Seedance 1.5 Pro</option>
                </select>
              </label>
            </div>
          </section>

          <section class="car-advanced-section">
            <h3>封面与发布信息</h3>
            <div class="car-check-grid">
              <label class="car-check">
                <input
                  type="checkbox"
                  :checked="settings.generateCover"
                  @change="patch({ generateCover: ($event.target as HTMLInputElement).checked })"
                />
                <span>生成封面</span>
              </label>
              <label class="car-check">
                <input
                  type="checkbox"
                  :checked="settings.generateTitle"
                  @change="patch({ generateTitle: ($event.target as HTMLInputElement).checked })"
                />
                <span>生成标题</span>
              </label>
              <label class="car-check">
                <input
                  type="checkbox"
                  :checked="settings.generateDescription"
                  @change="patch({ generateDescription: ($event.target as HTMLInputElement).checked })"
                />
                <span>生成简介</span>
              </label>
              <label class="car-check">
                <input
                  type="checkbox"
                  :checked="settings.generateTags"
                  @change="patch({ generateTags: ($event.target as HTMLInputElement).checked })"
                />
                <span>生成标签</span>
              </label>
            </div>
          </section>
        </div>

        <footer class="car-advanced-footer">
          <button type="button" class="app-secondary-button" @click="$emit('reset')">恢复默认</button>
          <button type="button" class="app-primary-button" @click="$emit('update:modelValue', false)">完成</button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CAR_NATIVE_SPEECH_STYLE_OPTIONS,
  CAR_NATIVE_VOICE_STYLE_OPTIONS,
  normalizeCarNativeSpeechStyle,
  normalizeCarNativeVoiceStyle,
} from '../../constants/carSalesVoiceStyles'

export type OverlayPosition = 'top' | 'middle' | 'bottom'

export interface CarSalesTextOverlaySettings {
  enabled: boolean
  text: string
  fontFamily: string
  fontSize: number
  textColor: string
  outlineColor: string
  position: OverlayPosition
}

export interface CarSalesAdvancedSettings {
  hostAppearanceEnabled: boolean
  videoType: 'standard' | 'digital_human' | 'product_showcase' | 'silent_bgm'
  subtitleMode: 'auto' | 'off' | 'upload'
  customSubtitle: string
  burnInSubtitle: boolean
  subtitleOverlay: CarSalesTextOverlaySettings
  headlineOverlay: CarSalesTextOverlaySettings
  audioPolicy: 'auto' | 'none' | 'voiceover' | 'bgm' | 'EXTERNAL_AUDIO' | 'VIDEO_NATIVE_AUDIO' | 'external_audio' | 'video_native_audio'
  bgmStyle: 'auto' | 'none' | 'upbeat' | 'premium' | 'warm' | 'tech'
  videoStyle: 'realistic' | 'premium' | 'energetic' | 'family' | 'tech'
  tone: 'professional' | 'promotional' | 'premium' | 'energetic' | 'warm' | 'tech'
  nativeVoiceStyle: string
  nativeSpeechStyle: string
  model: string
  generateCover: boolean
  generateTitle: boolean
  generateDescription: boolean
  generateTags: boolean
}

const props = defineProps<{
  modelValue: boolean
  settings: CarSalesAdvancedSettings
  selectedAvatarName?: string
  selectedAvatarPreviewUrl?: string
  hasHostMaterial?: boolean
  selectedSceneName?: string
  selectedScenePreviewUrl?: string
  hasSceneMaterial?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:settings': [value: CarSalesAdvancedSettings]
  reset: []
  'select-avatar': []
  'select-host-asset': []
  'clear-avatar': []
  'select-scene-asset': []
  'clear-scene': []
}>()

const hostMaterialLabel = computed(() => props.hasHostMaterial ? '已选择数字人素材' : '尚未选择数字人')
const femaleVoiceStyleOptions = computed(() => CAR_NATIVE_VOICE_STYLE_OPTIONS.filter((item) => item.gender === 'female'))
const maleVoiceStyleOptions = computed(() => CAR_NATIVE_VOICE_STYLE_OPTIONS.filter((item) => item.gender === 'male'))
const speechStyleOptions = computed(() => CAR_NATIVE_SPEECH_STYLE_OPTIONS)
const selectedVoiceStyleHint = computed(() => {
  const value = normalizeCarNativeVoiceStyle(props.settings.nativeVoiceStyle)
  return CAR_NATIVE_VOICE_STYLE_OPTIONS.find((item) => item.value === value)?.hint || ''
})
const selectedSpeechStyleHint = computed(() => {
  const value = normalizeCarNativeSpeechStyle(props.settings.nativeSpeechStyle)
  return CAR_NATIVE_SPEECH_STYLE_OPTIONS.find((item) => item.value === value)?.hint || ''
})
const selectedAvatarHint = computed(() => {
  if (props.selectedAvatarName) return '已回填数字人形象，并加入素材列表'
  if (props.hasHostMaterial) return '已从资产中心选择数字人图片或口播视频'
  return '请选择数字人形象或从资产中心加入 host_image/host_video'
})

const selectedSceneHint = computed(() => {
  if (props.hasSceneMaterial) return '已加入本次生成，会随 sceneImageUrls 传给视频生成'
  return '可从资产中心选择公共场景图，补充展厅、道路、门店等背景约束'
})

function patch(partial: Partial<CarSalesAdvancedSettings>) {
  emit('update:settings', {
    ...props.settings,
    ...partial,
  })
}

function patchVideoType(videoType: CarSalesAdvancedSettings['videoType']) {
  patch({
    videoType,
    hostAppearanceEnabled: videoType === 'digital_human'
      ? true
      : videoType === 'product_showcase' || videoType === 'silent_bgm'
        ? false
        : props.settings.hostAppearanceEnabled,
    audioPolicy: (videoType === 'silent_bgm' || videoType === 'product_showcase') && props.settings.audioPolicy === 'auto'
      ? 'bgm'
      : props.settings.audioPolicy,
  })
}

function patchOverlay(
  key: 'subtitleOverlay' | 'headlineOverlay',
  partial: Partial<CarSalesTextOverlaySettings>,
) {
  emit('update:settings', {
    ...props.settings,
    [key]: {
      ...props.settings[key],
      ...partial,
    },
  })
}

function numberFromEvent(event: Event, fallback: number) {
  const value = Number((event.target as HTMLInputElement).value)
  return Number.isFinite(value) ? value : fallback
}
</script>

<style scoped>
.car-advanced-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.28);
}

.car-advanced-drawer {
  display: flex;
  width: min(520px, 100vw);
  height: 100vh;
  flex-direction: column;
  background: #fff;
  box-shadow: -12px 0 32px rgba(15, 23, 42, 0.16);
}

.car-advanced-head,
.car-advanced-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--hs-border);
  padding: 18px 20px;
}

.car-advanced-footer {
  border-top: 1px solid var(--hs-border);
  border-bottom: 0;
}

.car-advanced-head h2 {
  margin: 0;
  color: var(--hs-text);
  font-size: 18px;
  font-weight: 800;
}

.car-advanced-head p {
  margin: 4px 0 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.car-advanced-close {
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

.car-advanced-body {
  display: grid;
  flex: 1;
  gap: 12px;
  overflow-y: auto;
  padding: 16px 20px;
}

.car-advanced-section {
  display: grid;
  gap: 12px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: var(--hs-surface-muted);
  padding: 14px;
}

.car-advanced-section h3 {
  margin: 0;
  color: var(--hs-text);
  font-size: 14px;
  font-weight: 800;
}

.car-segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.car-segmented button {
  min-height: 36px;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text-muted);
  font-weight: 700;
}

.car-segmented button.active {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.car-avatar-picker {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}

.car-scene-picker {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}

.car-avatar-preview {
  overflow: hidden;
  width: 58px;
  height: 58px;
  border-radius: 8px;
  background: #eef2ff;
}

.car-scene-preview,
.car-scene-empty {
  overflow: hidden;
  width: 96px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  background: #eef2ff;
}

.car-scene-empty {
  display: grid;
  place-items: center;
  color: var(--hs-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.car-avatar-preview img,
.car-scene-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.car-avatar-meta {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.car-avatar-meta strong {
  overflow: hidden;
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.car-avatar-meta small {
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.car-avatar-actions {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: 8px;
}

.car-avatar-actions button {
  min-height: 32px;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.car-avatar-actions button:hover {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.car-field {
  display: grid;
  gap: 7px;
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 700;
}

.car-field small {
  color: var(--hs-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}

.car-field select,
.car-field input,
.car-advanced-section textarea {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #fff;
  color: var(--hs-text);
  padding: 0 10px;
  outline: none;
}

.car-advanced-section textarea {
  min-height: 82px;
  padding: 10px;
  line-height: 1.6;
  resize: vertical;
}

.car-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 700;
}

.car-check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.car-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.car-advanced-note {
  margin: 0;
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 560px) {
  .car-grid-two,
  .car-check-grid,
  .car-segmented {
    grid-template-columns: 1fr;
  }
}
</style>

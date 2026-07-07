<template>
  <section class="pet-post-panel" :class="{ 'pet-post-panel--compact': compact }">
    <header class="pet-post-head">
      <div>
        <h3>后期参数与生产约束</h3>
        <p>统一管理宠物视频的口播、口型、字幕、BGM、背景图和产品/道具说明，生成前会写入宠物草稿。</p>
      </div>
      <button v-if="showSyncButton" type="button" @click="syncScriptFromDialogue()">从台词同步脚本</button>
    </header>

    <div class="pet-post-grid">
      <section class="pet-post-card">
        <h4>口播 / 音频</h4>
        <div class="pet-post-segmented">
          <button type="button" :class="{ active: !draft.voiceEnabled }" @click="setVoiceMode('silent')">
            无口播
          </button>
          <button type="button" :class="{ active: draft.voiceEnabled && !selectedAudio }" @click="setVoiceMode('tts')">
            AI 配音
          </button>
          <button type="button" :class="{ active: draft.voiceEnabled && selectedAudio }" @click="setVoiceMode('audio')">
            使用音频
          </button>
        </div>
        <div class="pet-audio-summary">
          <strong>{{ selectedAudio?.label || '未选择口播/BGM 音频' }}</strong>
          <span>{{ selectedAudio ? '已写入 materials.audio，可在素材面板替换' : '可在“宠物生产素材”中选择或上传音频' }}</span>
        </div>
        <label class="pet-check">
          <input v-model="draft.lipSyncEnabled" type="checkbox" :disabled="!draft.voiceEnabled" @change="handleChange" />
          <span>口型同步</span>
        </label>
        <label class="pet-check">
          <input v-model="draft.bgmEnabled" type="checkbox" @change="handleChange" />
          <span>背景音乐</span>
        </label>
        <p class="pet-post-note">开启口型同步时必须有有效台词；BGM 与口播共用宠物音频槽，真实合成以后端 provider 能力为准。</p>
      </section>

      <section class="pet-post-card">
        <h4>字幕 / 文案</h4>
        <label class="pet-field">
          <span>字幕策略</span>
          <select v-model="subtitleMode" @change="applySubtitleMode">
            <option value="auto">自动字幕建议</option>
            <option value="custom">使用脚本/字幕文本</option>
            <option value="off">关闭字幕</option>
          </select>
        </label>
        <textarea
          v-if="subtitleMode === 'custom'"
          v-model="draft.scriptText"
          maxlength="1000"
          placeholder="输入或粘贴口播脚本/字幕文本；也可以从宠物资产中心导入文案。"
          @input="handleChange"
        />
        <div class="pet-import-row">
          <label class="pet-upload-text">
            <input type="file" accept=".txt,.srt,.json,text/plain,application/json" @change="handleTextAssetUpload" />
            <span>{{ textUploading ? '上传中...' : '上传字幕/脚本' }}</span>
          </label>
          <button type="button" :disabled="textLoading" @click="loadTextAssets">
            {{ textLoading ? '加载中...' : '导入资产' }}
          </button>
        </div>
        <div v-if="textAssetOpen" class="pet-text-assets">
          <div class="pet-text-toolbar">
            <input v-model.trim="textKeyword" placeholder="搜索脚本、字幕、分镜 JSON" @keydown.enter.prevent="loadTextAssets" />
            <select v-model="textScope">
              <option value="private">私有素材</option>
              <option value="global">公共素材</option>
              <option value="all">全部素材</option>
            </select>
          </div>
          <p v-if="textAssetError" class="pet-post-error">{{ textAssetError }}</p>
          <div v-else-if="textAssets.length === 0" class="pet-text-empty">暂无可导入的宠物脚本/字幕资产。</div>
          <button
            v-for="asset in textAssets"
            :key="asset.assetId"
            type="button"
            class="pet-text-asset"
            @click="importTextAsset(asset)"
          >
            <strong>{{ asset.fileName }}</strong>
            <span>{{ asset.assetType }} · {{ asset.sourceType || '素材' }}</span>
          </button>
        </div>
      </section>

      <section class="pet-post-card">
        <h4>字幕样式</h4>
        <div class="pet-grid-two">
          <label class="pet-field">
            <span>位置</span>
            <select v-model="draft.subtitleStyle.position" :disabled="!draft.subtitleEnabled" @change="handleChange">
              <option value="bottom">底部</option>
              <option value="middle">中部</option>
              <option value="top">顶部</option>
            </select>
          </label>
          <label class="pet-field">
            <span>字体</span>
            <select :value="effectiveSubtitleStyle.fontFamily" :disabled="!draft.subtitleEnabled" @change="setSubtitleFromEvent('fontFamily', $event)">
              <option v-for="item in fontOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="pet-field">
            <span>字号</span>
            <input :value="effectiveSubtitleStyle.fontSize" type="number" min="20" max="64" step="2" :disabled="!draft.subtitleEnabled" @input="setSubtitleNumberFromEvent('fontSize', $event)" />
          </label>
          <label class="pet-check pet-check--boxed">
            <input v-model="draft.subtitleStyle.highlighted" type="checkbox" :disabled="!draft.subtitleEnabled" @change="handleChange" />
            <span>卡片字幕</span>
          </label>
        </div>
        <div class="pet-color-row">
          <span>文字颜色</span>
          <button
            v-for="item in colorPresets"
            :key="`text-${item.value}`"
            type="button"
            class="pet-color-swatch"
            :class="{ active: effectiveSubtitleStyle.textColor === item.value }"
            :style="{ backgroundColor: item.value }"
            :title="item.label"
            :disabled="!draft.subtitleEnabled"
            @click="setSubtitleColor('textColor', item.value)"
          />
        </div>
        <div class="pet-stroke-row">
          <button
            v-for="item in strokeOptions"
            :key="item.value"
            type="button"
            :class="{ active: effectiveSubtitleStyle.strokeMode === item.value }"
            :title="item.hint"
            :disabled="!draft.subtitleEnabled"
            @click="setSubtitleColor('strokeMode', item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="pet-subtitle-preview" :class="`pos-${draft.subtitleStyle.position}`">
          <span :style="subtitlePreviewStyle">{{ subtitlePreviewText }}</span>
        </div>
      </section>

      <section class="pet-post-card">
        <h4>背景图 / 产品图</h4>
        <label class="pet-field">
          <span>产品/道具展示要求</span>
          <textarea
            v-model="draft.visualSettings.productPrompt"
            maxlength="160"
            placeholder="例如：猫咪自然靠近宠物零食袋，产品只作为道具出现，不遮挡宠物脸部"
            @input="handleChange"
          />
        </label>
        <label class="pet-field">
          <span>背景图/场景要求</span>
          <textarea
            v-model="draft.visualSettings.backgroundPrompt"
            maxlength="160"
            placeholder="例如：温暖客厅背景，浅景深，干净柔和，宠物主体清晰突出"
            @input="handleChange"
          />
        </label>
        <div class="pet-background-presets">
          <button type="button" @click="setBackgroundPreset('温暖客厅背景，浅景深，干净柔和，宠物主体清晰突出')">温暖客厅</button>
          <button type="button" @click="setBackgroundPreset('阳光草地背景，色彩明亮，宠物动作自然可爱')">阳光草地</button>
          <button type="button" @click="setBackgroundPreset('宠物用品展示背景，桌面干净，产品作为道具不遮挡主宠')">用品展示</button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getAssetTextContent, getAssets, uploadMaterialAsset, type AssetListScope } from '../../../services/assetApi'
import type { AssetItem } from '../../../types/assetTypes'
import type { PetCreationDraft, PetSubtitleStyle } from '../petCreationTypes'
import {
  DEFAULT_PET_SUBTITLE_STYLE,
  PET_TEXT_COLOR_PRESETS,
  PET_TEXT_FONT_OPTIONS,
  PET_TEXT_STROKE_MODE_OPTIONS,
  petSubtitlePreviewStyle,
} from '../petPostProductionConfig'

const props = defineProps<{
  draft: PetCreationDraft
  compact?: boolean
  showSyncButton?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const subtitleMode = ref<'auto' | 'custom' | 'off'>(initialSubtitleMode())
const textAssetOpen = ref(false)
const textLoading = ref(false)
const textUploading = ref(false)
const textAssetError = ref('')
const textKeyword = ref('')
const textScope = ref<AssetListScope>('all')
const textAssets = ref<AssetItem[]>([])

const fontOptions = PET_TEXT_FONT_OPTIONS
const colorPresets = PET_TEXT_COLOR_PRESETS
const strokeOptions = PET_TEXT_STROKE_MODE_OPTIONS

const selectedAudio = computed(() => props.draft.materials.find((item) => item.role === 'audio'))
const effectiveSubtitleStyle = computed(() => ({
  ...DEFAULT_PET_SUBTITLE_STYLE,
  ...props.draft.subtitleStyle,
}))
const subtitlePreviewText = computed(() => {
  const scriptFirstLine = props.draft.scriptText?.trim().split(/\n+/)[0]
  const dialogueFirstLine = props.draft.dialogueLines.find((line) => line.text.trim())?.text.trim()
  const shotFirstLine = props.draft.shots.find((shot) => shot.subtitle.trim())?.subtitle.trim()
  return scriptFirstLine || dialogueFirstLine || shotFirstLine || '字幕显示在安全区'
})
const subtitlePreviewStyle = computed(() => petSubtitlePreviewStyle(props.draft.subtitleStyle))

function initialSubtitleMode(): 'auto' | 'custom' | 'off' {
  if (!props.draft.subtitleEnabled) return 'off'
  return props.draft.scriptText?.trim() ? 'custom' : 'auto'
}

watch(
  () => [props.draft.subtitleEnabled, props.draft.scriptText],
  () => {
    subtitleMode.value = initialSubtitleMode()
  },
)

function handleChange() {
  if (!props.draft.voiceEnabled && props.draft.lipSyncEnabled) {
    props.draft.lipSyncEnabled = false
  }
  emit('change')
}

function applySubtitleMode() {
  props.draft.subtitleEnabled = subtitleMode.value !== 'off'
  if (subtitleMode.value === 'custom' && !props.draft.scriptText?.trim()) {
    syncScriptFromDialogue(false)
  }
  handleChange()
}

function setVoiceMode(mode: 'silent' | 'tts' | 'audio') {
  if (mode === 'silent') {
    props.draft.voiceEnabled = false
    props.draft.lipSyncEnabled = false
  } else {
    props.draft.voiceEnabled = true
  }
  handleChange()
}

function syncScriptFromDialogue(showEmptyMessage = true) {
  const lines = props.draft.dialogueLines
    .filter((line) => line.text.trim())
    .map((line) => {
      const role = props.draft.roles.find((item) => item.id === line.speakerRoleId)
      return `${role?.name || '宠物'}：${line.text.trim()}`
    })
  if (!lines.length) {
    if (showEmptyMessage) {
      props.draft.scriptText = props.draft.scriptText || ''
    }
    return
  }
  props.draft.scriptText = lines.join('\n')
  props.draft.subtitleEnabled = true
  subtitleMode.value = 'custom'
  handleChange()
}

function setSubtitleColor<K extends keyof PetSubtitleStyle>(key: K, value: PetSubtitleStyle[K]) {
  props.draft.subtitleStyle = {
    ...props.draft.subtitleStyle,
    [key]: value,
  }
  handleChange()
}

function setSubtitleFromEvent<K extends keyof PetSubtitleStyle>(key: K, event: Event) {
  setSubtitleColor(key, (event.target as HTMLSelectElement).value as PetSubtitleStyle[K])
}

function setSubtitleNumberFromEvent<K extends keyof PetSubtitleStyle>(key: K, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  setSubtitleColor(key, (Number.isFinite(value) ? value : DEFAULT_PET_SUBTITLE_STYLE.fontSize) as PetSubtitleStyle[K])
}

function setBackgroundPreset(value: string) {
  props.draft.visualSettings.backgroundPrompt = value
  handleChange()
}

function textAssetMetadata(assetRole = 'voice_script') {
  return JSON.stringify({
    businessDomain: 'pet',
    domain: 'pet_creation',
    assetGroup: '宠物脚本/字幕',
    assetRole,
  })
}

async function handleTextAssetUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  textUploading.value = true
  textAssetError.value = ''
  try {
    const asset = await uploadMaterialAsset(file, {
      businessDomain: 'pet',
      metadataJson: textAssetMetadata(file.name.toLowerCase().endsWith('.srt') ? 'subtitle' : 'voice_script'),
    })
    await importTextAsset(asset)
    await loadTextAssets()
  } catch (error) {
    textAssetError.value = error instanceof Error ? error.message : '上传字幕/脚本资产失败'
  } finally {
    textUploading.value = false
  }
}

async function loadTextAssets() {
  textAssetOpen.value = true
  textLoading.value = true
  textAssetError.value = ''
  try {
    const lists = await Promise.all(
      (['TEXT', 'JSON'] as const).map((assetType) =>
        getAssets({
          assetType,
          keyword: textKeyword.value,
          scope: textScope.value,
          pageNo: 1,
          pageSize: 20,
          businessDomain: 'pet',
        }),
      ),
    )
    const seen = new Set<number>()
    textAssets.value = lists.flat().filter((asset) => {
      if (seen.has(asset.assetId)) return false
      seen.add(asset.assetId)
      return true
    })
  } catch (error) {
    textAssets.value = []
    textAssetError.value = error instanceof Error ? error.message : '加载脚本/字幕资产失败'
  } finally {
    textLoading.value = false
  }
}

async function importTextAsset(asset: AssetItem) {
  textAssetError.value = ''
  try {
    const content = await getAssetTextContent(asset)
    applyTextAssetContent(asset, content)
  } catch (error) {
    textAssetError.value = error instanceof Error ? error.message : '导入脚本/字幕资产失败'
  }
}

function applyTextAssetContent(asset: AssetItem, content: string) {
  const text = content.trim()
  if (!text) {
    textAssetError.value = '该资产内容为空'
    return
  }
  if (asset.assetType === 'JSON') {
    try {
      const parsed = JSON.parse(text) as unknown
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { shots?: unknown }).shots)) {
        props.draft.shots = ((parsed as { shots: PetCreationDraft['shots'] }).shots || []).filter(Boolean)
      }
    } catch {
      // JSON 资产无法解析为分镜时仍作为脚本文本导入。
    }
  }
  props.draft.scriptText = text.length > 1000 ? text.slice(0, 1000) : text
  props.draft.subtitleEnabled = true
  subtitleMode.value = 'custom'
  handleChange()
}
</script>

<style scoped>
.pet-post-panel,
.pet-post-card,
.pet-text-assets {
  display: grid;
  gap: 12px;
}

.pet-post-panel {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-post-panel--compact {
  box-shadow: none;
}

.pet-post-panel--compact .pet-post-grid {
  grid-template-columns: 1fr;
}

.pet-post-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pet-post-head h3,
.pet-post-card h4 {
  margin: 0;
  color: #172033;
  font-weight: 900;
}

.pet-post-head h3 {
  font-size: 17px;
}

.pet-post-card h4 {
  font-size: 14px;
}

.pet-post-head p,
.pet-post-note,
.pet-audio-summary span,
.pet-text-empty {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.pet-post-head button,
.pet-import-row button,
.pet-upload-text span,
.pet-background-presets button,
.pet-text-asset,
.pet-post-segmented button,
.pet-stroke-row button {
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

.pet-post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pet-post-card {
  align-content: start;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 14px;
}

.pet-post-segmented,
.pet-import-row,
.pet-background-presets,
.pet-stroke-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-post-segmented button.active,
.pet-stroke-row button.active {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.pet-audio-summary {
  display: grid;
  gap: 4px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.pet-audio-summary strong,
.pet-field span,
.pet-check span {
  color: #172033;
  font-size: 13px;
  font-weight: 850;
}

.pet-check {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-check--boxed {
  min-height: 36px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 10px;
}

.pet-field {
  display: grid;
  gap: 6px;
}

.pet-field select,
.pet-field input,
.pet-field textarea,
.pet-text-toolbar input,
.pet-text-toolbar select,
.pet-post-card > textarea {
  min-height: 36px;
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 10px;
  font-size: 13px;
}

.pet-field textarea,
.pet-post-card > textarea {
  min-height: 82px;
  padding: 10px;
  line-height: 1.6;
  resize: vertical;
}

.pet-upload-text {
  display: inline-flex;
  cursor: pointer;
}

.pet-upload-text input {
  display: none;
}

.pet-text-toolbar,
.pet-grid-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 8px;
}

.pet-text-asset {
  display: grid;
  height: auto;
  justify-items: start;
  gap: 3px;
  padding: 9px 10px;
  text-align: left;
}

.pet-text-asset strong {
  color: #172033;
  font-size: 13px;
}

.pet-text-asset span {
  color: #667085;
  font-size: 12px;
}

.pet-post-error {
  margin: 0;
  border-radius: 8px;
  background: #fff1f2;
  color: #be123c;
  padding: 9px 10px;
  font-size: 13px;
}

.pet-color-row {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
}

.pet-color-row > span {
  color: #172033;
  font-size: 13px;
  font-weight: 850;
}

.pet-color-swatch {
  width: 24px;
  height: 24px;
  border: 2px solid #d0d5dd;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.pet-color-swatch.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16), inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.pet-subtitle-preview {
  position: relative;
  overflow: hidden;
  min-height: 150px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.24)),
    linear-gradient(135deg, #dbeafe 0%, #fce7f3 46%, #dcfce7 100%);
}

.pet-subtitle-preview::before {
  position: absolute;
  inset: 28px 34% 24px 34%;
  border-radius: 48% 48% 28% 28%;
  background: rgba(37, 99, 235, 0.16);
  content: "";
}

.pet-subtitle-preview span {
  position: absolute;
  left: 50%;
  z-index: 1;
  width: 86%;
  max-width: 86%;
  transform: translateX(-50%);
  overflow-wrap: anywhere;
  text-align: center;
  line-height: 1.18;
  white-space: pre-wrap;
}

.pet-subtitle-preview.pos-top span {
  top: 18px;
}

.pet-subtitle-preview.pos-middle span {
  top: 50%;
  transform: translate(-50%, -50%);
}

.pet-subtitle-preview.pos-bottom span {
  bottom: 22px;
}

button:disabled,
input:disabled,
select:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

@media (max-width: 980px) {
  .pet-post-grid,
  .pet-grid-two,
  .pet-text-toolbar {
    grid-template-columns: 1fr;
  }

  .pet-post-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

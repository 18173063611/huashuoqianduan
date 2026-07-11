<template>
  <section class="pet-generation-param-panel" :class="{ compact }">
    <div class="pet-generation-param-head">
      <h3>生成参数</h3>
      <span>{{ draft.durationSeconds }} 秒 / {{ draft.aspectRatio }}</span>
    </div>

    <label class="pet-param-field">
      <span>自定义时长</span>
      <div class="pet-duration-input">
        <input
          v-model.number="draft.durationSeconds"
          type="number"
          :min="PET_MIN_VIDEO_DURATION_SECONDS"
          :max="PET_MAX_VIDEO_DURATION_SECONDS"
          step="1"
          @input="durationHint = ''"
          @blur="normalizeDurationInput"
        />
        <strong>秒</strong>
      </div>
      <small v-if="durationHint" class="pet-duration-hint" role="alert">{{ durationHint }}</small>
    </label>

    <div class="pet-param-grid">
      <label v-if="showMode">
        生成模式
        <select v-model="draft.generationMode" @change="emitChange">
          <option value="dialogue_video">多宠物对话</option>
          <option value="reference_video">参考图生成</option>
          <option value="image_to_video">图片生成视频</option>
          <option value="text_video">纯文本生成</option>
        </select>
      </label>
      <label>
        比例
        <select v-model="draft.aspectRatio" @change="emitChange">
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="1:1">1:1</option>
        </select>
      </label>
      <label>
        语言
        <select v-model="draft.language" @change="emitChange">
          <option value="zh-CN">中文讲述</option>
        </select>
      </label>
      <label>
        基础风格
        <select v-model="draft.style" @change="handleStyleChange">
          <option v-for="option in styleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <label class="pet-param-field wide">
      <span>风格描述</span>
      <textarea
        v-model.trim="draft.visualSettings.stylePrompt"
        maxlength="160"
        placeholder="例如：温暖家庭纪实、干净小红书风、柔和自然光、轻松治愈"
        @blur="emitChange"
      />
    </label>

    <div class="pet-style-presets">
      <button
        v-for="preset in stylePresets"
        :key="preset.label"
        type="button"
        @click="applyStylePreset(preset)"
      >
        {{ preset.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PetCreationDraft, PetCreationStyle } from '../petCreationTypes'
import {
  PET_MAX_VIDEO_DURATION_SECONDS,
  PET_MIN_VIDEO_DURATION_SECONDS,
  normalizePetVideoDurationSeconds,
} from '../petCreationValidation'

const props = withDefaults(defineProps<{
  draft: PetCreationDraft
  compact?: boolean
  showMode?: boolean
}>(), {
  compact: false,
  showMode: false,
})

const emit = defineEmits<{
  change: []
}>()

const durationHint = ref('')

const styleOptions: Array<{ value: PetCreationStyle; label: string }> = [
  { value: 'cute', label: '可爱' },
  { value: 'funny', label: '搞笑' },
  { value: 'healing', label: '治愈' },
  { value: 'realistic', label: '写实' },
  { value: 'anime', label: '动漫' },
  { value: 'anthropomorphic', label: '轻拟人' },
]

const stylePresets: Array<{ label: string; style: PetCreationStyle; prompt: string }> = [
  { label: '温暖家庭感', style: 'healing', prompt: '温暖家庭纪实、柔和自然光、干净室内、陪伴感强' },
  { label: '真实纪实', style: 'realistic', prompt: '真实宠物摄影质感、自然光、动作轻微稳定、画面干净' },
  { label: '搞笑短剧', style: 'funny', prompt: '短视频轻喜剧节奏、表情反应明显、镜头稳定、结尾有反差' },
  { label: '干净治愈', style: 'healing', prompt: '清爽干净、柔和色调、低幅动作、温暖治愈氛围' },
  { label: '动漫表情', style: 'anime', prompt: '动漫感表情强化、色彩明亮、构图简洁、主体稳定不变形' },
]

function ensureVisualSettings() {
  if (!props.draft.visualSettings) {
    props.draft.visualSettings = {
      expressionIntensity: 70,
      cameraRhythm: 'balanced',
      backgroundPrompt: '',
      productPrompt: '',
      stylePrompt: '',
    }
  }
  if (typeof props.draft.visualSettings.stylePrompt !== 'string') {
    props.draft.visualSettings.stylePrompt = ''
  }
}

function normalizeDurationInput() {
  const value = Number(props.draft.durationSeconds)
  durationHint.value = Number.isInteger(value)
    && value >= PET_MIN_VIDEO_DURATION_SECONDS
    && value <= PET_MAX_VIDEO_DURATION_SECONDS
    ? ''
    : `当前视频仅支持 ${PET_MIN_VIDEO_DURATION_SECONDS}-${PET_MAX_VIDEO_DURATION_SECONDS} 秒，已自动调整。`
  props.draft.durationSeconds = normalizePetVideoDurationSeconds(props.draft.durationSeconds)
  emitChange()
}

function handleStyleChange() {
  ensureVisualSettings()
  emitChange()
}

function applyStylePreset(preset: { style: PetCreationStyle; prompt: string }) {
  ensureVisualSettings()
  props.draft.style = preset.style
  props.draft.visualSettings.stylePrompt = preset.prompt
  emitChange()
}

function emitChange() {
  ensureVisualSettings()
  emit('change')
}
</script>

<style scoped>
.pet-generation-param-panel {
  display: grid;
  gap: 12px;
}

.pet-generation-param-panel:not(.compact) {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.pet-generation-param-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-generation-param-head h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 900;
}

.pet-generation-param-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-duration-hint {
  color: #b54708;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.5;
}

.pet-param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pet-param-field,
.pet-param-grid label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-param-field.wide {
  grid-column: 1 / -1;
}

.pet-duration-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  overflow: hidden;
  width: 160px;
  max-width: 100%;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
}

.pet-duration-input input,
.pet-param-grid select,
.pet-param-field textarea {
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  font-size: 13px;
  outline: none;
}

.pet-duration-input input {
  min-height: 36px;
  border: 0;
  padding: 0 10px;
  font-weight: 850;
}

.pet-duration-input strong {
  display: grid;
  min-width: 42px;
  place-items: center;
  border-left: 1px solid #dfe7f5;
  background: #f8fbff;
  color: #475467;
  font-size: 12px;
}

.pet-param-grid select {
  min-height: 36px;
  padding: 0 10px;
}

.pet-param-field textarea {
  min-height: 64px;
  resize: vertical;
  padding: 10px 12px;
  line-height: 1.5;
}

.pet-style-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-style-presets button {
  min-height: 32px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.pet-style-presets button:hover {
  border-color: #7aa7ff;
  background: #eff6ff;
}

@media (max-width: 760px) {
  .pet-param-grid {
    grid-template-columns: 1fr;
  }
}
</style>

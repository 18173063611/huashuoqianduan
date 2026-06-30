<template>
  <div class="quick-control-area">
    <div class="quick-control-bar" aria-label="基础生成参数">
      <label class="quick-control-field quick-control-field--duration">
        <span>时长</span>
        <input
          class="quick-duration-input"
          type="text"
          inputmode="numeric"
          maxlength="3"
          placeholder="15"
          :value="durationInput"
          :disabled="busy"
          @focus="beginDurationEdit"
          @input="updateDurationInput"
          @blur="commitDurationInput"
          @keydown.enter.prevent="commitDurationInput"
        />
        <em>秒</em>
      </label>
      <label class="quick-control-field">
        <span>语言</span>
        <select :value="voiceLanguage" :disabled="busy" @change="emitVoiceLanguage">
          <option v-for="item in voiceLanguageOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="quick-control-field">
        <span>比例</span>
        <select :value="aspectRatio" :disabled="busy" @change="emitAspectRatio">
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="auto">跟随素材</option>
        </select>
      </label>
      <button class="quick-drawer-button" type="button" :disabled="busy" @click="$emit('open-advanced')">
        高级参数
      </button>
      <button
        class="app-primary-button quick-generate-button"
        :class="{ 'quick-generate-button--needs-input': submitBlockReason && !busy && !planPreviewLoading }"
        type="button"
        :disabled="busy || planPreviewLoading"
        :title="submitBlockReason || generateTitle || '进入方案编辑'"
        @click="$emit('generate')"
      >
        {{ planPreviewLoading ? '方案生成中...' : busy ? busyLabel || '生成中...' : generateLabel || '立即生成' }}
      </button>
    </div>
    <div class="quick-credit-line">
      <span v-if="taskStatus">{{ taskStatus }}<template v-if="taskProgress != null"> · {{ taskProgress }}%</template></span>
      <span v-else-if="submitBlockReason" class="quick-submit-block-reason">生成前还需：{{ submitBlockReason }}</span>
      <span v-else>消耗积分：{{ estimatedCreditCost }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  targetDuration: number
  voiceLanguage: string
  voiceLanguageOptions: ReadonlyArray<{ value: string; label: string }>
  aspectRatio: '9:16' | '16:9' | 'auto'
  busy: boolean
  canSubmit: boolean
  submitBlockReason: string
  planPreviewLoading: boolean
  taskStatus: string
  taskProgress: number | null
  estimatedCreditCost: number
  generateLabel?: string
  generateTitle?: string
  busyLabel?: string
}>()

const durationInput = ref(String(normalizeDurationValue(props.targetDuration)))
const durationEditing = ref(false)

const emit = defineEmits<{
  'update:targetDuration': [value: number]
  'update:voiceLanguage': [value: string]
  'update:aspectRatio': [value: '9:16' | '16:9' | 'auto']
  'open-advanced': []
  generate: []
}>()

watch(
  () => props.targetDuration,
  (value) => {
    if (!durationEditing.value) {
      durationInput.value = String(normalizeDurationValue(value))
    }
  },
)

function normalizeDurationValue(value: unknown, fallback = 15) {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return fallback
  return Math.max(4, Math.min(120, Math.round(raw)))
}

function beginDurationEdit() {
  durationEditing.value = true
}

function updateDurationInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  const value = (target?.value || '').replace(/[^\d]/g, '')
  durationInput.value = value
  if (target && target.value !== value) {
    target.value = value
  }
}

function commitDurationInput() {
  const fallback = normalizeDurationValue(props.targetDuration)
  const value = durationInput.value.trim()
    ? normalizeDurationValue(durationInput.value, fallback)
    : fallback
  durationEditing.value = false
  durationInput.value = String(value)
  emit('update:targetDuration', value)
}

function emitVoiceLanguage(event: Event) {
  const target = event.target as HTMLSelectElement | null
  emit('update:voiceLanguage', target?.value || 'zh-CN')
}

function emitAspectRatio(event: Event) {
  const target = event.target as HTMLSelectElement | null
  const value = target?.value
  emit('update:aspectRatio', value === '16:9' || value === 'auto' ? value : '9:16')
}
</script>

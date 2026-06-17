<template>
  <div class="quick-control-area">
    <div class="quick-control-bar" aria-label="基础生成参数">
      <label class="quick-control-field">
        <span>时长</span>
        <select :value="targetDuration" :disabled="busy" @change="emitDuration">
          <option :value="10">10秒</option>
          <option :value="15">15秒</option>
          <option :value="20">20秒</option>
          <option :value="30">30秒</option>
        </select>
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
        :title="submitBlockReason || '立即生成汽车销售视频'"
        @click="$emit('generate')"
      >
        {{ planPreviewLoading ? '方案生成中...' : busy ? '生成中...' : '立即生成' }}
      </button>
    </div>
    <div class="quick-credit-line">
      <span v-if="taskStatus">{{ taskStatus }}<template v-if="taskProgress != null"> · {{ taskProgress }}%</template></span>
      <span v-else-if="submitBlockReason" class="quick-submit-block-reason">生成前还需：{{ submitBlockReason }}</span>
      <span v-else>消耗积分：20</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  targetDuration: number
  voiceLanguage: string
  voiceLanguageOptions: Array<{ value: string; label: string }>
  aspectRatio: '9:16' | '16:9' | 'auto'
  busy: boolean
  canSubmit: boolean
  submitBlockReason: string
  planPreviewLoading: boolean
  taskStatus: string
  taskProgress: number | null
}>()

const emit = defineEmits<{
  'update:targetDuration': [value: number]
  'update:voiceLanguage': [value: string]
  'update:aspectRatio': [value: '9:16' | '16:9' | 'auto']
  'open-advanced': []
  generate: []
}>()

function emitDuration(event: Event) {
  const target = event.target as HTMLSelectElement | null
  emit('update:targetDuration', Number(target?.value || 15))
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

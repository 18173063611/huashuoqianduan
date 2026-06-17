<template>
  <div class="quick-prompt-box">
    <textarea
      :value="modelValue"
      :disabled="disabled"
      maxlength="500"
      rows="3"
      :placeholder="placeholder || '描述你想要的视频，例如：帮我生成一条比亚迪宋PLUS销售视频，突出空间大和家庭出行场景'"
      @input="emitInput"
    />
    <div class="quick-prompt-meta">
      <span :class="{ warning: required && !modelValue.trim() }">{{ characterCount }}/500</span>
      <small>{{ helperText }}</small>
      <button
        type="button"
        class="quick-magic-button"
        :disabled="disabled || !canUseMagic"
        title="使用 AI 推荐卖点"
        aria-label="使用 AI 推荐卖点"
        @click="$emit('use-magic')"
      >
        ✦
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  disabled: boolean
  characterCount: number
  helperText: string
  canUseMagic: boolean
  placeholder?: string
  required?: boolean
}>(), {
  placeholder: '',
  required: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'use-magic': []
}>()

function emitInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  emit('update:modelValue', target?.value.trim() || '')
}
</script>

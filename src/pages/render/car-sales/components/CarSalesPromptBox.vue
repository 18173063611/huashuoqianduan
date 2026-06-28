<template>
  <div class="quick-prompt-box">
    <textarea
      :value="modelValue"
      :disabled="disabled"
      maxlength="500"
      rows="3"
      :placeholder="placeholder || '可选填写：描述你想要的视频，例如突出空间、续航、智能座舱或到店促销'"
      @input="emitInput"
    />
    <p class="quick-prompt-optional-note">需求描述为选填，不输入也可以直接选择车型素材包生成。</p>
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

<style scoped>
.quick-prompt-optional-note {
  position: absolute;
  right: 148px;
  bottom: 14px;
  left: 18px;
  overflow: hidden;
  margin: 0;
  color: #8a94ab;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  pointer-events: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .quick-prompt-optional-note {
    right: 92px;
    font-size: 11px;
  }
}
</style>

<template>
  <div class="video-platform-tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === option.value"
      :class="{ 'is-active': modelValue === option.value }"
      :disabled="disabled"
      @click="handleSelect(option.value)"
    >
      <span class="video-platform-tabs__logo" :class="`logo-${option.value}`" aria-hidden="true">
        <img v-if="platformIcon(option.value)" :src="platformIcon(option.value)" alt="" />
        <span v-else>⌁</span>
      </span>
      <span class="video-platform-tabs__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import bilibiliIcon from '../../assets/platforms/bilibili.svg'
import douyinIcon from '../../assets/platforms/douyin.svg'
import facebookIcon from '../../assets/platforms/facebook.svg'
import kuaishouIcon from '../../assets/platforms/kuaishou.svg'
import tiktokIcon from '../../assets/platforms/tiktok.svg'
import wechatIcon from '../../assets/platforms/wechat.svg'
import xiaohongshuIcon from '../../assets/platforms/xiaohongshu.svg'
import youtubeIcon from '../../assets/platforms/youtube.svg'

type VideoPlatformTabOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: VideoPlatformTabOption[]
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    disabled: false,
    ariaLabel: '视频平台',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [value: string]
}>()

const platformIcons: Record<string, string> = {
  bilibili: bilibiliIcon,
  douyin: douyinIcon,
  facebook: facebookIcon,
  kuaishou: kuaishouIcon,
  tiktok: tiktokIcon,
  wechat_channels: wechatIcon,
  xiaohongshu: xiaohongshuIcon,
  youtube: youtubeIcon,
}

function platformIcon(value: string) {
  return platformIcons[value] || ''
}

function handleSelect(value: string) {
  if (props.disabled) {
    return
  }
  emit('update:modelValue', value)
  emit('select', value)
}
</script>

<style scoped>
.video-platform-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
}

.video-platform-tabs button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #344054;
  padding: 0 12px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.video-platform-tabs button:hover:not(:disabled),
.video-platform-tabs button.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: none;
}

.video-platform-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.video-platform-tabs__logo {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  border-radius: 5px;
}

.video-platform-tabs__logo img {
  display: block;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.video-platform-tabs__logo.logo-auto {
  background: #e8f1ff;
  color: #1261ff;
  font-size: 13px;
  font-weight: 900;
}

.video-platform-tabs__label {
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .video-platform-tabs {
    display: grid;
    grid-template-columns: 1fr;
  }

  .video-platform-tabs button {
    width: 100%;
  }
}
</style>

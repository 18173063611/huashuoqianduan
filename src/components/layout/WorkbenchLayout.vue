<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark">AI</span>
        <div>
          <strong>数字人视频</strong>
          <small>制作工作台</small>
        </div>
      </div>
      <nav class="app-menu">
        <button
          v-for="item in menuItems"
          :key="item.key"
          :class="['app-menu-item', { active: item.key === activeKey }]"
          type="button"
          @click="$emit('change', item.key)"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div>
          <p class="app-eyebrow">工作台</p>
          <h1>{{ activeTitle }}</h1>
        </div>
        <div class="app-status-pill">在线</div>
      </header>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const menuItems = [
  { key: 'projects', label: '项目管理' },
  { key: 'upload', label: '文件上传' },
  { key: 'video-parse', label: '视频解析' },
  { key: 'script-rewrite', label: '文案改写' },
  { key: 'storyboard', label: '分镜脚本' },
  { key: 'voice', label: '声音选择' },
  { key: 'avatar', label: '形象生成' },
  { key: 'render', label: '视频合成' },
  { key: 'publish', label: '标题封面' },
  { key: 'assets', label: '资产中心' },
  { key: 'tasks', label: '任务中心' },
  { key: 'flow', label: '生成流程' },
] as const

type MenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: MenuKey
}>()

defineEmits<{
  change: [key: MenuKey]
}>()

const activeTitle = computed(() => menuItems.find((item) => item.key === props.activeKey)?.label ?? '项目管理')
</script>
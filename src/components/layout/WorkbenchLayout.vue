<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark">◇</span>
        <div>
          <strong>AI爆款视频改造</strong>
          <small>智能内容生产工作台</small>
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
          <span class="app-menu-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="app-sidebar-card">
        <span>工作模式</span>
        <strong>全局资产模式</strong>
        <small>无需先创建项目</small>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div class="app-stepper" aria-label="制作流程">
          <div
            v-for="(step, index) in flowSteps"
            :key="step.key"
            :class="['app-step', { active: index === activeStepIndex, done: index < activeStepIndex }]"
          >
            <span>{{ index + 1 }}</span>
            <strong>{{ step.label }}</strong>
          </div>
        </div>
        <div class="app-topbar-actions">
          <button class="app-ghost-button" type="button" @click="$emit('change', 'assets')">资产中心</button>
          <span class="app-status-dot">在线</span>
        </div>
      </header>

      <section class="app-hero">
        <div>
          <p class="app-eyebrow">{{ activeTitle }}</p>
          <h1>{{ activeHeadline }}</h1>
          <p>{{ activeDescription }}</p>
        </div>
        <div class="app-hero-project">
          <span>当前范围</span>
          <strong>全局资产</strong>
          <small>当前阶段：{{ currentStage }}</small>
        </div>
      </section>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const menuItems = [
  { key: 'video-parse', label: '爆款对标', icon: '◉' },
  { key: 'storyboard', label: '分镜生成', icon: '▤' },
  { key: 'voice', label: '声音生成', icon: '♬' },
  { key: 'avatar', label: '数字人形象', icon: '◎' },
  { key: 'render', label: '视频制作', icon: '▻' },
  { key: 'assets', label: '资产中心', icon: '◫' },
] as const

type MenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: MenuKey
}>()

defineEmits<{
  change: [key: MenuKey]
}>()

const activeTitle = computed(() => menuItems.find((item) => item.key === props.activeKey)?.label ?? '爆款对标')

const flowSteps = [
  { key: 'video-parse', label: '对标分析' },
  { key: 'storyboard', label: '脚本生成' },
  { key: 'voice', label: '声音合成' },
  { key: 'avatar', label: '数字人形象生成' },
  { key: 'render', label: '视频制作生成' },
] as const

const stepIndexMap: Record<MenuKey, number> = {
  'video-parse': 0,
  storyboard: 1,
  voice: 2,
  avatar: 3,
  render: 4,
  assets: 4,
}

const activeStepIndex = computed(() => stepIndexMap[props.activeKey] ?? 0)

const activeHeadline = computed(() => {
  return activeTitle.value
})

const activeDescription = computed(() => {
  return '无需先创建项目，直接完成素材、脚本、声音、形象与成片制作。'
})

const currentStage = computed(() => flowSteps[activeStepIndex.value]?.label ?? '对标分析')
</script>

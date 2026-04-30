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
        <span>当前项目</span>
        <strong>{{ project?.projectName || '请先选择项目' }}</strong>
        <small>{{ project?.status || '待选择' }}</small>
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
          <button class="app-ghost-button" type="button" @click="$emit('change', 'projects')">切换项目</button>
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
          <span>当前项目</span>
          <strong>{{ project?.projectName || '未选择项目' }}</strong>
          <small>当前阶段：{{ currentStage }}</small>
        </div>
      </section>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProjectItem } from '../../types/projectTypes'

const menuItems = [
  { key: 'projects', label: '工作台', icon: '⌂' },
  { key: 'upload', label: '项目素材', icon: '▣' },
  { key: 'video-parse', label: '爆款对标', icon: '◉' },
  { key: 'script-rewrite', label: '数字人脚本', icon: '✎' },
  { key: 'storyboard', label: '分镜生成', icon: '▤' },
  { key: 'voice', label: '数字人形象', icon: '♬' },
  { key: 'avatar', label: '角色库', icon: '◎' },
  { key: 'render', label: '视频制作', icon: '▻' },
  { key: 'publish', label: '模板库', icon: '▧' },
  { key: 'assets', label: '资产中心', icon: '◫' },
  { key: 'tasks', label: '任务中心', icon: '☷' },
  { key: 'flow', label: '生成流程', icon: '↗' },
] as const

type MenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: MenuKey
  project?: ProjectItem
}>()

defineEmits<{
  change: [key: MenuKey]
}>()

const activeTitle = computed(() => menuItems.find((item) => item.key === props.activeKey)?.label ?? '项目管理')

const flowSteps = [
  { key: 'video-parse', label: '对标分析' },
  { key: 'script-rewrite', label: '脚本生成' },
  { key: 'avatar', label: '数字人形象生成' },
  { key: 'voice', label: '声音合成' },
  { key: 'render', label: '视频制作生成' },
] as const

const stepIndexMap: Record<MenuKey, number> = {
  projects: 0,
  upload: 0,
  'video-parse': 0,
  'script-rewrite': 1,
  storyboard: 1,
  avatar: 2,
  voice: 3,
  render: 4,
  publish: 4,
  assets: 4,
  tasks: 4,
  flow: 4,
}

const activeStepIndex = computed(() => stepIndexMap[props.activeKey] ?? 0)

const activeHeadline = computed(() => {
  if (props.activeKey === 'projects') {
    return '工作台'
  }
  if (props.activeKey === 'script-rewrite') {
    return '对标分析（文案改写）'
  }
  return activeTitle.value
})

const activeDescription = computed(() => {
  if (props.activeKey === 'projects') {
    return '按流程完成项目、素材、脚本、声音、形象与成片制作。'
  }
  if (props.activeKey === 'script-rewrite') {
    return '分析爆款视频结构，改写成适合数字人口播的脚本内容。'
  }
  return '按流程完成项目、素材、脚本、声音、形象与成片制作。'
})

const currentStage = computed(() => flowSteps[activeStepIndex.value]?.label ?? '对标分析')
</script>
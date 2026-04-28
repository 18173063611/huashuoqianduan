<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark">AI</span>
        <div>
          <strong>Digital Human Video</strong>
          <small>Week 1 Framework</small>
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
          <p class="app-eyebrow">MVP Workbench</p>
          <h1>{{ activeTitle }}</h1>
        </div>
        <div class="app-status-pill">API Prefix /api/v1</div>
      </header>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 当前先用静态菜单支撑 MVP 演示，后续接权限或路由时再抽成配置。
const menuItems = [
  { key: 'projects', label: 'Projects' },
  { key: 'upload', label: 'Upload' },
  { key: 'flow', label: 'Flow' },
  { key: 'acceptance', label: 'Acceptance' },
] as const

type MenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: MenuKey
}>()

defineEmits<{
  change: [key: MenuKey]
}>()

const activeTitle = computed(() => menuItems.find((item) => item.key === props.activeKey)?.label ?? 'Projects')
</script>
<template>
  <div class="fwx-shell">
    <aside class="fwx-sidebar">
      <div class="fwx-brand">
        <span class="fwx-brand-mark">AI</span>
        <div>
          <strong>数字人视频</strong>
          <small>费文轩本周框架</small>
        </div>
      </div>
      <nav class="fwx-menu">
        <button
          v-for="item in menuItems"
          :key="item.key"
          :class="['fwx-menu-item', { active: item.key === activeKey }]"
          type="button"
          @click="$emit('change', item.key)"
        >
          {{ item.label }}
        </button>
      </nav>
    </aside>

    <main class="fwx-main">
      <header class="fwx-topbar">
        <div>
          <p class="fwx-eyebrow">MVP 工作台</p>
          <h1>{{ activeTitle }}</h1>
        </div>
        <div class="fwx-status-pill">接口前缀 /api/v1</div>
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
  { key: 'flow', label: '生成流程' },
  { key: 'acceptance', label: '验收说明' },
] as const

type FwxMenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: FwxMenuKey
}>()

defineEmits<{
  change: [key: FwxMenuKey]
}>()

const activeTitle = computed(() => menuItems.find((item) => item.key === props.activeKey)?.label ?? '项目管理')
</script>

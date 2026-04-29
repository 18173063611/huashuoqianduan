<template>
  <section class="app-card app-page-stack module-skeleton">
    <header class="module-skeleton-header">
      <h2 class="module-skeleton-title">{{ title }}</h2>
      <p v-if="!project" class="module-skeleton-project-hint app-muted">请先在「项目管理」中选择当前项目。</p>
      <p v-else class="app-selected-project module-skeleton-project-hint">当前项目 · {{ project.projectName }}</p>
    </header>

    <div class="module-status-card">
      <p class="module-status-eyebrow">功能</p>
      <p class="module-status-headline">{{ feature }}</p>
      <p class="module-status-eyebrow">输入</p>
      <p class="module-status-detail">{{ input }}</p>
      <p class="module-status-eyebrow">输出</p>
      <p class="module-status-detail">{{ output }}</p>
      <p class="module-status-eyebrow">状态</p>
      <p class="module-status-detail">{{ status }}</p>
    </div>

    <p v-if="hint" class="app-muted module-skeleton-inline-hint">{{ hint }}</p>
  </section>
</template>

<script setup lang="ts">
import type { ProjectItem } from '../../types/projectTypes'

defineProps<{
  title: string
  project?: ProjectItem
  feature: string
  input: string
  output: string
  status: string
  hint?: string
}>()
</script>

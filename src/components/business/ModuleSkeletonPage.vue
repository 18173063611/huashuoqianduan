<template>
  <section class="app-card app-page-stack module-skeleton">
    <header class="module-skeleton-header">
      <h2 class="module-skeleton-title">{{ title }}</h2>
      <p class="module-skeleton-project-hint app-muted">全局模式：无需选择项目，功能接入后将直接在此使用。</p>
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
defineProps<{
  title: string
  feature: string
  input: string
  output: string
  status: string
  hint?: string
}>()
</script>

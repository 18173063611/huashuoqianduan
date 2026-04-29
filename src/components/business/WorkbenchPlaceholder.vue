<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <p class="app-eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
      </div>
      <span class="app-status-pill">{{ statusText }}</span>
    </div>

    <div class="app-empty">{{ emptyText }}</div>

    <div class="app-mock-grid">
      <div v-for="item in mockItems" :key="item.label" class="app-mock-item">
        <strong>{{ item.label }}</strong>
        <p>{{ item.value }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface MockItem {
  label: string
  value: string
}

withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    emptyText: string
    statusText?: string
    mockItems: readonly MockItem[]
  }>(),
  {
    statusText: 'MVP 骨架',
  },
)
</script>

<template>
  <article class="quick-recent-item quick-recent-item--placeholder">
    <div class="quick-recent-thumb">
      <img :src="carPlaceholderImage" alt="" />
    </div>
    <div class="quick-recent-main">
      <strong>{{ item.title }}</strong>
      <p>{{ item.meta }}</p>
    </div>
    <div class="quick-recent-side">
      <span class="app-task-status quick-status-pill--OTHER">示例</span>
      <div class="quick-recent-buttons">
        <button class="app-secondary-button" type="button" @click="$emit('go-task-center')">全部作品</button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { RecentVisualPlaceholder } from './RecentCarSalesVideos.vue'

defineProps<{
  item: RecentVisualPlaceholder
  carPlaceholderImage: string
}>()

defineEmits<{
  'go-task-center': []
}>()
</script>

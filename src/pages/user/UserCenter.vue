<template>
  <section class="user-center app-card app-page-stack">
    <AssetCenter :highlight-asset-id="highlightAssetId" @highlight-consumed="$emit('highlightConsumed')" />
  </section>
</template>

<script setup lang="ts">
import AssetCenter from '../asset/AssetCenter.vue'

defineProps<{
  /** 从任务等入口跳转时，在资产中心高亮对应行 */
  highlightAssetId?: number | null
}>()

defineEmits<{
  highlightConsumed: []
}>()
</script>

<style scoped>
.user-center.app-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
}
</style>

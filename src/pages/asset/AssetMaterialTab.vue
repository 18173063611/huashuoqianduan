<template>
  <div class="asset-hub-tab-scroll">
    <AssetCenter
      panel-mode="materials"
      :business-domain="businessDomain"
      :highlight-asset-id="highlightAssetId"
      @highlight-consumed="$emit('highlightConsumed')"
    />
  </div>
</template>

<script setup lang="ts">
import AssetCenter from './AssetCenter.vue'

defineProps<{
  highlightAssetId?: number | null
  businessDomain?: 'pet'
}>()

defineEmits<{
  highlightConsumed: []
}>()
</script>

<style scoped>
.asset-hub-tab-scroll {
  max-height: min(72vh, 720px);
  min-height: 280px;
  overflow: auto;
  padding-right: 2px;
}
</style>

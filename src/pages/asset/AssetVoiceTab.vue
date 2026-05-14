<template>
  <div class="asset-hub-tab-scroll">
    <AssetCenter panel-mode="voices" />
  </div>
</template>

<script setup lang="ts">
import AssetCenter from './AssetCenter.vue'
</script>

<style scoped>
.asset-hub-tab-scroll {
  max-height: min(72vh, 720px);
  min-height: 280px;
  overflow: auto;
  padding-right: 2px;
}
</style>

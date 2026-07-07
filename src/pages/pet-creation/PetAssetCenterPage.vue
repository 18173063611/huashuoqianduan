<template>
  <section class="pet-asset-center-page app-page-stack">
    <header class="pet-asset-page-head">
      <div>
        <span>宠物创作中心</span>
        <h1>宠物资产中心</h1>
        <p>只管理宠物创作相关素材，主宠物、第二只宠物、产品/道具、背景/场景、口播/BGM 音频和字幕脚本均与车辆资产隔离。</p>
      </div>
    </header>

    <AssetCenter panel-mode="materials" business-domain="pet" />
  </section>
</template>

<script setup lang="ts">
import AssetCenter from '../asset/AssetCenter.vue'
</script>

<style scoped>
.pet-asset-center-page {
  display: grid;
  gap: 16px;
}

.pet-asset-page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px 20px;
}

.pet-asset-page-head span {
  display: block;
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-asset-page-head h1 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.pet-asset-page-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.55;
}
</style>
